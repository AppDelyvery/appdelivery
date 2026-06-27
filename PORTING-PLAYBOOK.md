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

### C. ~~Máquina de mensalidade~~ — DESCARTADO · modelo errado ❌
**Por que saiu (corrigido 27/06):** foi porte indevido do AgendaPRO. O **AppDelyvery é transacional** — a plataforma (do **Tulio**, o dono; a Impulso só CONSTRÓI) fatura em **cada entrega** via `take_rate` 20% (split 80/20, **já construído**) + carteira pré-paga. O lojista **NÃO paga mensalidade**; cobrar isso em cima do por-entrega seria barreira de adesão e dois pesos no mesmo cliente.
**A "mensalidade" do contrato é outra coisa:** Impulso ← Tulio (R$15k de build + mensalidade de manutenção a acertar) — cobrança comercial entre Impulso e o dono, **fora do app**, não billing por-lojista. A migration 0047 chegou a ser aplicada e foi **revertida (0048)**.
**Lição (λ.lógica-primeiro):** não portar padrão maduro de outro produto sem validar que o **modelo de receita** bate. AgendaPRO = receita 100% mensalidade; AppDelyvery = receita 100% comissão por entrega. Padrões diferentes.

### D. Anti-bot no cadastro (Turnstile + captcha nativo do Supabase Auth)  ✅ ATIVO E PROVADO (27/06)
> Provado na fonte: signup sem token → Supabase recusa (`captcha protection: request disallowed`); site key embutida no bundle de prod → widget renderiza (usuário real cadastra normal). Cloudflare Turnstile + captcha ligado no Supabase Auth + env no Vercel.
**Gap:** o AgendaPRO foi **botado (5 contas em 6s)** e teve que desligar signup público. AppDelyvery cadastra **dois** tipos de usuário (estabelecimento E entregador) via `auth.signUp` **no client** (signup público ligado), sem proteção.
**Diagnóstico (nível certo):** captcha só no formulário é teatro — o bot chama o endpoint do Supabase direto, fora do form. O fix robusto é o **captcha nativo do Supabase Auth** (valida o token server-side no próprio signup) + widget Turnstile passando `captchaToken`. NÃO precisa de service-role nem de tabela `signup_attempts` (o Supabase Auth já tem rate-limit por IP embutido).
**Feito:** `components/auth/Turnstile.tsx` (degrada gracioso: sem `NEXT_PUBLIC_TURNSTILE_SITE_KEY` não renderiza, cadastro segue como hoje) + cabeado em `CadastroNegocio` e `CadastroEntregador` (`captchaToken` no `signUp`). Build verde, non-breaking.
**Falta ATIVAR (Eduardo, ~5 min):** (1) criar widget Cloudflare Turnstile grátis → pega site key + secret; (2) `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no `.env.local` E no Vercel; (3) Supabase → Authentication → Settings → Bot Protection → Enable Captcha (Turnstile) + colar o secret.
**Fonte da lição:** `agendapro` v86.

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
**Caso AppDelyvery:** "recarga confirmada", "saque pago", "entregador aprovado", "pedido a caminho".
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
1. ✅ **A + B** (compressão + índices) — feito e provado.
2. ✅ **D** (anti-bot cadastro) — feito e ativo.
3. ❌ ~~C (mensalidade)~~ — descartado (modelo errado; ver acima).
4. **E + F + G** conforme a operação pedir (E/Supervisor V4 é o melhor candidato — aprovar saque remoto).
5. Tier 3 quando escalar.

> Os fluxos de dinheiro do AppDelyvery, pra não confundir: **(1) carteira pré-paga** lojista→entregas (temos) · **(2) split 80/20 + saque** entregador (temos) · **(3) take 20%** da plataforma por entrega = receita do **Tulio** (dono). A mensalidade Impulso←Tulio é comercial, **fora do app**. Lojista NÃO paga mensalidade.
