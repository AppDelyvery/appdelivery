# APPDELYVERY — Checklist de Progresso

> **Auditoria de estado real — 27/06/2026.** Levantado lendo **código + 45 migrations + libs/actions + .env.local** (não os docs antigos). Substitui a versão de 08/06, que estava defasada (dizia 27 migrations e Asaas = esqueleto 501; a realidade é bem mais avançada).
>
> **Método e ressalva (λ.prova-na-fonte):** esta é auditoria de **código e migrations no repo**, não do banco ao vivo. O `.env.local` está **sem `SUPABASE_SERVICE_ROLE_KEY`**, então não dei read-after-write na fonte nesta passada. `[x]` = código presente e coerente (e produção tem 3 contas demo rodando com redirect por papel testado em Playwright), **não** "re-provado no banco hoje". Quando a service-role entrar, rodar os `scripts/verify-*.mjs` pra fechar a prova.

**Legenda:** `[x]` pronto no código/no ar · `[~]` construído, falta ligar (chave/flag) · `[ ]` a construir (estrutura nova)

**Leitura rápida:** a plataforma (telas, banco, motor, API, GPS, push, deploy) está **praticamente toda pronta e no ar**. O que falta pra "operar de verdade" quase não é tela nem código — é **plugar chaves no CNPJ do dono** (Asaas + verificação + service-role), **ligar a flag de cobrança**, adicionar **SMS/WhatsApp** e fechar o **jurídico**. Estimativa: **~85% do setup pronto**; os ~15% restantes são integrações externas + ativação + polimento.

---

## A. PRONTO E NO AR (código presente · produção rodando)

### Fundação
- [x] Stack **Next 16.2 + React 19 + Supabase + Tailwind v4**, deploy contínuo (push `main` → Vercel)
- [x] No ar: **appdelivery-psi.vercel.app** (site, login, app, rastreio)
- [x] Auth real (cadastro/login) + **redirect por papel** (negócio/entregador/admin) — testado em Playwright em prod
- [x] PWA instalável (manifest, ícones) — abre no `/login` e roteia por papel
- [x] SEO/AEO (metadata, llms.txt, robots, sitemap)
- [x] Design system (Inter, índigo, `Icons.tsx` SVG, zero emoji), responsivo mobile
- [x] **3 contas demo** (`demo.admin@` / `demo.negocio@` / `demo.entregador@`, senha `Demo1234`)

### Banco — **45 migrations no repo (0001–0045)**
- [x] **~22 tabelas** (profiles, estabelecimentos, entregadores, pedidos, ofertas, comprovantes, rastreios, pagamentos, avaliacoes, carteira_transacoes, recargas, saques, mensagens, disputas, chaves_api, config, estabelecimento_membros, comunicados, push_subscriptions, entregador_documentos, verificacoes, cancelamentos)
- [x] **~42 RPCs/funções** + PostGIS (geography, GiST index, `find_entregadores_proximos`, `ST_DWITHIN`)
- [x] RLS em todas as tabelas + **guards de segurança** por trigger:
  - anti self-promote admin (`guard_profile_role`, 0004)
  - status só com evidência foto+assinatura+código (`guard_pedido_status`, 0004/0008)
  - entregador não se auto-aprova (`guard_entregador_update`, 0003)
  - anti-spoofing no chat (autor_papel validado contra a entidade, 0006)
  - LGPD: payload de `verificacoes` só admin (0002)
- [x] Auditoria adversarial de RLS (2 furos achados e fechados na 0004)
- [~] **Aplicação das 45 migrations no banco não re-provada nesta auditoria** (sem service-role) — assume-se aplicada pela regra "migration antes do push"

### 3 personas + cliente (todas REAL, no ar)
- [x] **Negócio (12 telas):** novo-pedido+mapa, histórico, **carteira+recarga Pix**, perfil, comunicados, **avaliações**, relatórios/CSV, **integração API**, **equipe multi-usuário**, configurações, ajuda+disputa
- [x] **Entregador (8 telas):** flow cadastro→verificação→oferta→coleta→rota→entrega, ganhos, **carteira+saque**, perfil, comunicados, avaliações, configurações, ajuda
- [x] **Admin (12 telas):** dashboard, despacho ao vivo, corridas+comprovante, entregadores+aprovação(PIN), negócios, financeiro, rankings, avaliações, mensagens, disputas, comunicados, config (preço/take/raio/PIN/operadores)
- [x] **Cliente final:** `/rastreio/[token]` (sem login) + GPS ao vivo (polling 6s) + chat 3-pontas + avaliação

### Motor e recursos
- [x] **Oferta dirigida** (modelo 99: ranking distância×nota×**confiabilidade**, timer 30s, cascata, aceite atômico) + cron
- [x] **Heartbeat anti-fantasma** (libera aceite travado em 120s → volta pro pool) + score de confiabilidade (abandonos/cancelamentos penalizam ranking) — 0043
- [x] GPS ao vivo (Supabase Realtime) + geofence anti-fraude na entrega
- [x] **Preço por veículo** (moto/carro/van) + **parada extra + espera** (modelo Borzo/TôNoLucro, 0044) + config editável no admin
- [x] Comprovação forte (foto + assinatura + código 4 dígitos)
- [x] Cancelamento com motivo (entregador e lojista) + estorno idempotente, proteção de carga (teto config)
- [x] **API de integração v1** (criar pedido + cotação + status + webhook HMAC) — modelo Bee→Drogasil, provada no ar
- [x] Mapbox real (rotas pelas ruas + geocoding + tradutor de endereço Palmas/ARSE)
- [x] **Avaliações com revelação D+1** (cron `recalcular_ratings` 00:05) — entregador↔lojista↔cliente
- [x] **Web Push** (VAPID configurado): oferta pro entregador + status pro lojista via `/api/notify/dispatch`

---

## B. CONSTRUÍDO, MAS FALTA LIGAR (chave/flag — não é código)

> O código está pronto como "tomada no-op": retorna `{configurado:false}` e o fluxo segue sem travar. Liga quando a chave/flag entra.

- [~] **Asaas — pagamento** — `lib/asaas.ts` completo (cobrança Pix + transferência), webhook `confirmar_recarga` real, triggers de cobrança/split/estorno prontos. Falta: `ASAAS_API_KEY` + `ASAAS_WEBHOOK_TOKEN` + **ligar `config.cobranca_ativa`** + provar end-to-end no sandbox
- [~] **Carteira do lojista** — recarga Pix (0030), débito na criação do pedido (`cobrar_pedido`, 0031), extrato (`minhas_transacoes_carteira`, 0039) — só não circula dinheiro real sem a chave Asaas
- [~] **Split 80/20 + saque entregador** — trigger `creditar_entregador` credita 80% automático na entrega (0032); `reservar_saque`/`finalizar_saque` + transferência Pix D+1 (0033) — falta chave Asaas
- [~] **Verificação — Antecedentes (FlagCheck)** — `lib/verificacao/flagcheck.ts` pronto; falta `FLAGCHECK_API_KEY`
- [~] **Verificação — CNH/CRLV (Infosimples)** — pronto; falta `INFOSIMPLES_TOKEN`
- [~] **Verificação — Biometria (idwall)** — pronto; falta `IDWALL_API_KEY` (exige e-mail corporativo + CNPJ)
- [~] **`SUPABASE_SERVICE_ROLE_KEY` vazia** — necessária pra verificação server-side, convite de equipe e confirmação de recarga no webhook. **Destrava B inteiro** + a prova na fonte.

---

## C. FALTA CONSTRUIR (estrutura nova — não é só plugar chave)

### Notificações
- [ ] **SMS/WhatsApp (Zenvia ou similar)** — não existe no código; definir provedor + credencial + envio do link de rastreio pro cliente final (hoje o link sai por fora; push web já cobre entregador/lojista logados)

### Endpoints pendentes
- [ ] `GET /api/rota` — retorna 501 "em construção" (proxy de Directions; **opcional** — o Mapbox já é chamado direto do client com token restrito por URL)

---

## D. JURÍDICO / INFRA / POLIMENTO

- [ ] **Termos de Uso e Privacidade** — existem (`/(legal)/termos`, `/(legal)/privacidade`) mas são **rascunho 0.1** com placeholders `[RAZÃO SOCIAL]`/`[CNPJ]`/`[DPO]`; validar com advogado (antecedentes = dado sensível LGPD)
- [ ] **Domínio próprio** — hoje é `appdelivery-psi…` (com "i"); a marca é **appdelyvery** (com "y"). Apontar `appdelyvery.com.br`
- [ ] Limpeza dos dados de teste no banco
- [ ] Validação visual final no celular (90% dos acessos são mobile)
- [ ] Definir hospedagem: Impulso hospeda e cobra na mensalidade, ou transfere contas pro dono

---

## CAMINHO CRÍTICO pra "operar de verdade"

Em ordem do que destrava o uso real:
1. **`SUPABASE_SERVICE_ROLE_KEY` no env** → destrava verificação server-side, convite de equipe, webhook de recarga **e a prova na fonte** (o mais barato e o que mais destrava)
2. **Conta Asaas no CNPJ do dono** (`ASAAS_API_KEY` + webhook token) + **ligar `cobranca_ativa`** → o dinheiro circulando (recarga, split, saque). Provar end-to-end no sandbox antes de prod
3. **3 chaves de verificação** (FlagCheck/Infosimples/idwall) no CNPJ → liga o diferencial real do produto (entregador verificado)
4. **SMS/WhatsApp** → link de rastreio pro cliente final (operação fluida)
5. **Jurídico** (termos/privacidade) + **domínio próprio** → cara de empresa séria

Itens 1–3 são o coração do "operar". O resto da plataforma já está de pé.

---

## NOTA PRO DOC DE VENDAS (setup R$15k × Fase 2)

- **Dentro do setup (R$15k):** plataforma completa (A) + ligar verificação e Asaas (B) + SMS + termos/domínio = "pronto pra operar".
- **Fase 2 (à parte, evolução):** apps nativos nas lojas (Play/App Store), Van intercidade, conectores Bling/Tiny, múltiplas paradas, agendamento, camada de IA.

---

> Próxima auditoria: refazer quando a `SERVICE_ROLE_KEY` entrar — aí dá pra fechar a prova na fonte (read-after-write) e converter os `[~]` provados em `[x]` com evidência de banco.
