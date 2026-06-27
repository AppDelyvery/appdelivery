# APPDELYVERY — Playbook de Portabilidade (o que trazer dos nossos sistemas em produção)

> Síntese de **27/06/2026**. Auditoria profunda de 3 produtos em produção — **AgendaPRO** (`agendapro`, ~91 migrations), **SystemPalace** (`palace-system`, fork premium), **ComandaPRO** (`acai-system` + `medellin-bar`, food-service) — cruzada contra o estado real do AppDelyvery (ver `CHECKLIST-PROGRESSO.md`).
>
> Objetivo: trazer pro AppDelyvery só o que ele **ainda não tem ou faz pior**. Tudo abaixo é padrão já validado em produção, não teoria.

---

## JÁ TEMOS — NÃO re-portar (pra não retrabalhar)

A auditoria sugeriu vários itens que o AppDelyvery **já implementou**. Ficam fora do playbook:
- **Rastreio público sem login** — temos `get_rastreio_publico(token)` (melhor que o "tracking code" do açaí).
- **Split 80/20 + carteira + saque** — temos (trigger `creditar_entregador` 0032, `reservar_saque`/`finalizar_saque` 0033, ledger `carteira_transacoes`). O modelo de "saldo acumulado + saque em tempo real" que o AgendaPRO disse faltar, nós **já construímos** (o AgendaPRO é por-período; o nosso é realtime — estamos à frente nesse ponto).
- **Web push** — temos (VAPID + `/api/notify/dispatch`).
- **PostGIS / realtime / guards RLS / SECURITY DEFINER em trigger** — temos.
- **Multi-tenant white-label progressivo** — não se aplica: AppDelyvery é **marketplace** (1 plataforma, N estabelecimentos como linhas), não 1 sistema white-label por cliente.

---

## TIER 1 — Fazer primeiro (alto impacto, gap real, baixo/médio esforço)

### A. `compress-image.ts` — compressão do comprovante de entrega  ⭐ ROI máximo
**Gap:** AppDelyvery **não tem** `browser-image-compression` no `package.json`. O entregador fotografa comprovante (assinatura/portão) **em campo, no 3G**. Hoje sobe a foto crua (5–10 MB) — trava o upload e a finalização da entrega.
**O quê:** portar `acai-system/src/lib/compress-image.ts` praticamente sem mudança. Já resolve: Web Worker (não trava o botão), output WebP, corrige EXIF (foto de iPhone deitada), rejeita HEIC com mensagem amigável, reembala em `File` com `contentType` correto pro Supabase Storage.
**Ajuste:** comprovante não precisa de 1100px/0.35MB — `800px / 0.25MB` basta.
**Fonte:** `acai-system/src/lib/compress-image.ts`
**Esforço:** ~1h. **Dependência:** nenhuma.

### B. Índices em FK de tenant + ANALYZE  ⭐ barato e preventivo
**Gap:** Postgres **não** indexa FK automaticamente. O AgendaPRO levou um bug real de **~6s por query** (seq scan) com o Olímpio antes da v90. AppDelyvery tem FKs quentes sem índice provável: `pedidos.estabelecimento_id`, `pedidos.entregador_id`, `ofertas.entregador_id`, `pedidos(status, created_at)`, `carteira_transacoes.estabelecimento_id`.
**O quê:** uma migration nova criando índices compostos nessas FKs + `ANALYZE` imediato. Verificar antes o que já existe.
**Fonte:** `agendapro` v90 (`idx_appointments_business_date`, `idx_appointments_business_status`) · `palace-system` (`idx_appointments_business_paid_at`).
**Esforço:** ~1h. **Dependência:** nenhuma. Fazer **antes** de escalar usuários.

### C. Máquina de MENSALIDADE (subscription + gate + cron)  ⭐⭐ maior gap estratégico
**Gap (o mais importante do playbook):** o modelo de venda do AppDelyvery é **R$15k setup + mensalidade**. Mas o código **não tem NENHUM enforcement de mensalidade**. A integração Asaas que temos é da **carteira pré-paga** (lojista paga as entregas) — é um fluxo de dinheiro **diferente** da assinatura SaaS. Sem isso, o lojista usa de graça pra sempre depois do setup.
**O quê (portar a máquina inteira do AgendaPRO):**
1. Tabela `subscriptions` (1:1 com `estabelecimentos`): `pago_ate` (fonte da verdade), `status` (trial|active|past_due|cancelled|pending_payment), `plan`, `plan_modalidade`, `asaas_subscription_id`, `grace_ends_at`, `permanent_courtesy`, `setup_paid_at`, `refund_deadline_at` (setup+7d, CDC art.49).
2. **Gate por status** (nunca olhar `pago_ate` direto): `admin_blocked = cancelled OR (past_due AND grace_ends_at < now())`.
3. **Checkout PIX inline** (sem redirect): `createPayment` + `getPixQrCode` → `{qr_image, qr_payload}` renderizado dentro do app.
4. **Cron diário** de expiração: PIX D-3 cobra, D+0/D+3 overdue; trial/cortesia D+0 → `status=pending_payment` (paywall). `permanent_courtesy=true` isenta (o AgendaPRO teve bug de "trial vitalício" até a v85 — já vem corrigido).
5. **Webhook sempre 200** + `PAYMENT_CONFIRMED` → estende `pago_ate`.
**Fonte:** `agendapro/src/lib/asaas.ts`, `api/billing/checkout-asaas`, `api/billing/status`, `api/webhooks/asaas`, `api/cron/billing-check`, `src/config/pricing.ts`.
**Atenção:** **separar bem os 2 fluxos de dinheiro** — `subscriptions` (mensalidade SaaS, dinheiro pra Impulso) ≠ `carteira/recargas` (lojista paga entregas, dinheiro circula pra entregador). Não misturar tabelas.
**Esforço:** alto (1–2 dias). **Maior valor estratégico do playbook.**

### D. Rate-limit de cadastro via tabela Postgres + Turnstile
**Gap:** o AgendaPRO foi **botado (5 contas em 6s)** e teve que desligar signup público. AppDelyvery cadastra **dois** tipos de usuário (estabelecimento E entregador) — superfície dobrada, e o rate-limit hoje é fraco/ausente.
**O quê:** tabela `signup_attempts(ip, created_at)` persistente + helper `checkRateLimit` (429) + CAPTCHA Turnstile no cadastro. Rate-limit in-memory **não funciona em serverless** (reseta em cold start).
**Fonte:** `agendapro` v86 (`signup_attempts`), `src/lib/rate-limit.ts`, `api/cadastro` · `palace-system/src/lib/rate-limit-api.ts`.
**Esforço:** ~meio dia.

---

## TIER 2 — Alto valor, esforço médio

### E. Supervisor V4 — aprovação remota de ação sensível (payload JSONB + trigger auto-apply)
**O padrão mais valioso do Palace.** Hoje o admin do AppDelyvery aprova entregador/modera com PIN, mas de forma **síncrona** (tem que estar na tela). O V4 resolve "ação sensível precisa de aprovação do dono ao vivo" de forma assíncrona e server-side:
1. Operador chama RPC `create_*_request(action, target, pending_payload JSONB)`.
2. Dono aprova em `/admin/supervisao` → status `pending→approved`.
3. **Trigger** `auto_apply` (AFTER UPDATE OF status, **SECURITY DEFINER**) detecta a transição + payload → dispatcher IF/ELSIF por `action` executa no banco.
4. Funciona mesmo se o operador fechou a tela.
**Caso de uso AppDelyvery:** aprovar **saque acima de um teto**, ajuste de preço de corrida, estorno, reativação de entregador suspenso. Hoje o saque (`saque.ts`) não tem gate de aprovação — esse é o encaixe natural.
**Fonte:** `palace-system` migration-v87/v88/v90, `/admin/supervisao`.
**Esforço:** médio-alto.

### F. Cutoff financeiro por tenant (`financial_start_date`)
**O quê:** quando um lojista entra no meio do mês, o financeiro dele mostra "a partir de X" sem mexer nos pedidos. Também serve pra **zerar financeiro pós-bug sem perder histórico**. Versão genérica do `clampToCutoff` do Palace = coluna `estabelecimentos.financial_start_date`, aplicada nas queries de `paid_at`.
**Fonte:** `palace-system/src/lib/palace-financial-cutoff.ts`.
**Esforço:** ~meio dia.

### G. E-mails transacionais (Resend)
**Gap:** AppDelyvery não tem `resend` no `package.json` — zero e-mail transacional. AgendaPRO/Palace mandam em tudo (recarga confirmada, pagamento, aprovação) **fire-and-forget** (`void fn().catch()`) pra não travar o webhook, branded (não expõe CPF do dono no header Asaas).
**Caso AppDelyvery:** "recarga confirmada", "saque pago", "entregador aprovado", "mensalidade vencendo".
**Fonte:** `agendapro` Resend + padrão fire-and-forget no webhook.
**Esforço:** ~meio dia.

---

## TIER 3 — Fase 2 / quando fizer sentido

### H. Fila offline + idempotência `op_id` (entregador em campo)
Entregador confirma entrega em zona sem sinal. Fila em localStorage, replay em ordem, `op_id` gerado antes de enviar, `upsert({onConflict:'op_id', ignoreDuplicates:true})`, reconciliação de IDs negativos, `cached()` write-through. É o cenário de conectividade **mais hostil** do app — alto impacto, mas build maior. **Fonte:** `medellin-bar/src/lib/offline.ts` + `data.ts`.

### I. Authorizations JSONB granular (upgrade do equipe gerente/operador)
Hoje temos permissão grossa (`estab_pleno` vs membro, migration 0042). O Palace tem 34 AuthKeys por usuário em JSONB + `AUTH_TO_SUPERVISOR_ACTION` (ação sem permissão vira pedido Supervisor V4). **Atenção** (lição do Palace): unificar tudo em UM `authorizations.ts` — o Palace tem 2 camadas sobrepostas (`permissions.ts` legado + `authorizations.ts`) por evolução histórica; não repetir o débito. **Fonte:** `palace-system/src/lib/authorizations.ts`.

### J. Cross-request cache no dashboard admin (`React.cache` + `unstable_cache`)
Despacho admin faz polling 8s; cache TTL 15–30s evita bater o banco 2× por render. **Fonte:** `palace-system/src/lib/admin-data.ts`.

### K. DESIGN.md canônico + sino Web Audio
Formalizar o design system num `DESIGN.md` machine-readable espelhando `globals.css` (índigo acento, verde só pago, 8pt, tri-modal, motion só transform+opacity). Sino de novo pedido via Web Audio (sem .mp3 pra hospedar). **Fonte:** `acai-system/DESIGN.md`, `medellin-bar/src/lib/notify.ts`.

---

## Ordem recomendada de execução
1. **A + B** (compressão + índices) — meio dia, ROI imediato, zero dependência.
2. **D** (rate-limit cadastro) — fecha buraco de segurança antes de divulgar.
3. **C** (mensalidade) — destrava o modelo de receita recorrente do contrato R$15k+mensal.
4. **E + F + G** conforme a operação pedir.
5. Tier 3 quando escalar.

> Os 3 fluxos de dinheiro do AppDelyvery, pra não confundir: **(1) mensalidade SaaS** (Tier 1.C — falta) · **(2) carteira pré-paga** lojista→entregas (temos) · **(3) split + saque** entregador (temos).
