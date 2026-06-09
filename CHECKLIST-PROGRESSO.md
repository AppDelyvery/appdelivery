# APPDELYVERY — Checklist de Progresso

> Estudo de estado real do projeto, levantado por auditoria do **código e do banco** (não dos docs antigos) em **08/06/2026**.
> Serve pra medir progresso e pra separar, no doc de vendas, o que é **setup (R$15k)** do que é **evolução (Fase 2, à parte)**.

**Legenda:** `[x]` pronto e provado · `[~]` construído mas falta ativar/ligar · `[ ]` a fazer

**Leitura rápida:** a plataforma (telas, banco, motor, API, GPS, deploy) está praticamente toda **pronta e no ar**. O que falta pra "operar de verdade" não é tela — é **ligar o dinheiro (Asaas)** e a **verificação (chaves no CNPJ)**, mais SMS/push e o jurídico. Estimativa: **~80% do setup pronto**; os ~20% restantes são integrações externas + polimento.

---

## A. PRONTO E NO AR (provado na fonte)

### Fundação
- [x] Stack Next 16 + Supabase + Vercel + Tailwind, deploy contínuo (push → Vercel)
- [x] No ar: **appdelivery-psi.vercel.app** (site, login, app, rastreio)
- [x] Auth real (cadastro/login) + redirect por papel (negócio/entregador/admin)
- [x] PWA instalável (manifest, ícones) — abre no `/login` e roteia por papel
- [x] SEO/AEO (metadata, llms.txt, robots, sitemap)
- [x] Design system (Inter, índigo, Icons.tsx SVG, zero emoji), responsivo mobile

### Banco (27 migrations aplicadas — 0001 a 0027)
- [x] ~18 tabelas (profiles, estabelecimentos, entregadores, pedidos, ofertas, comprovantes, mensagens, etc)
- [x] ~30 RPCs/funções + PostGIS (geolocalização)
- [x] RLS em todas as tabelas + guards de segurança (anti self-promote admin, status só com evidência, entregador não se auto-aprova)
- [x] Auditoria adversarial de RLS (2 furos achados e fechados)

### 3 personas + cliente (todas no ar)
- [x] **Negócio** (8 telas): novo pedido + mapa, histórico, perfil, comunicados, relatórios/CSV, integração API
- [x] **Entregador** (5 telas): cadastro→verificação→oferta→coleta→rota→entrega, ganhos, perfil, comunicados
- [x] **Admin** (12 telas): dashboard, despacho ao vivo, corridas+comprovante, entregadores+aprovação(PIN), negócios, financeiro, rankings, avaliações, mensagens, disputas, comunicados, config
- [x] **Cliente final**: rastreio por link (sem login) + GPS ao vivo + chat

### Motor e recursos
- [x] Algoritmo de oferta dirigida (modelo 99: ranking distância × nota, timer 30s, cascata, aceite atômico) + cron
- [x] GPS ao vivo (Supabase Realtime broadcast)
- [x] Preço por veículo (moto/carro/van) com match exato + config editável no admin
- [x] Comprovação forte (foto + assinatura + código de 4 dígitos) + geofence anti-fraude
- [x] Cancelamento com motivo (entregador e lojista), chat 3-pontas, proteção de carga (teto config)
- [x] **API de integração** (criar pedido + cotação + webhook HMAC) — provada no ar (modelo Bee→Drogasil)
- [x] Mapbox real (rotas pelas ruas + geocoding + tradutor de endereço de Palmas/ARSE)

---

## B. CONSTRUÍDO, MAS FALTA ATIVAR (precisa conta/chave no CNPJ do dono)

> O código está pronto como "tomada no-op" — liga quando a chave entra. Hoje não trava o fluxo (cai em modo manual).

- [~] **Verificação — Antecedentes (FlagCheck)** — falta `FLAGCHECK_API_KEY`
- [~] **Verificação — CNH/CRLV (Infosimples)** — falta `INFOSIMPLES_TOKEN`
- [~] **Verificação — Biometria/Face ID (idwall)** — falta `IDWALL_API_KEY` (exige e-mail corporativo + CNPJ)
- [~] **SERVICE_ROLE_KEY** vazia no ambiente — necessária pra verificação server-side e algumas ações admin

---

## C. FALTA CONSTRUIR (estrutura nova — não é só plugar chave)

### Pagamento real (a maior peça que falta)
- [ ] **Asaas — integração de verdade** (hoje só existe o webhook esqueleto que retorna 501)
  - [ ] Cliente/SDK Asaas + `ASAAS_API_KEY` / `ASAAS_WEBHOOK_TOKEN`
  - [ ] Carteira pré-paga: recarga via Pix (botão "Adicionar saldo" hoje desativado)
  - [ ] Split automático 80/20 na conclusão da entrega
  - [ ] Subconta do entregador + repasse D+1
  - [ ] Webhook real de confirmação de pagamento (`/api/webhooks/asaas`)
  - [ ] Extrato de carteira pro lojista

### Notificações
- [ ] **SMS/WhatsApp** (definir provedor — ex. Zenvia — + credencial + envio do link de rastreio)
- [ ] **Push notifications** (nova corrida pro entregador com som; hoje é polling)

### Endpoints pendentes
- [ ] `GET /api/rota` (retorna 501 — proxy de Directions, opcional)

---

## D. JURÍDICO / INFRA / POLIMENTO

- [ ] **Termos de Uso e Privacidade** — hoje são RASCUNHO; validar com advogado (dado sensível de antecedentes = LGPD)
- [ ] Domínio próprio (ex. appdelyvery.com.br) — hoje URL é `appdelivery-psi…` (com "i", a marca é com "y")
- [ ] Limpeza dos dados de teste no banco
- [ ] Validação visual final no celular (90% dos acessos são mobile)
- [ ] Definir hospedagem: Impulso hospeda e cobra na mensalidade, ou transfere contas pro dono

---

## CAMINHO CRÍTICO pra "operar de verdade"

Em ordem do que destrava o uso real:
1. **Contas no CNPJ do dono** → ligar verificação (3 chaves) — vira o diferencial real do produto
2. **Asaas** → o dinheiro circulando (recarga, split, repasse) — sem isso não fatura
3. **SMS/push** → avisar entregador e cliente (operação fluida)
4. **Jurídico** (termos/privacidade) + **domínio** → pra publicar com cara de empresa séria

Itens 1 e 2 são o coração do "operar". O resto da plataforma já está de pé.

---

## NOTA PRO DOC DE VENDAS (setup R$15k × Fase 2)

- **Dentro do setup (R$15k):** plataforma completa (A) + ligar verificação e Asaas (B+parte do C) + termos/domínio = "pronto pra operar".
- **Fase 2 (à parte, evolução):** apps nativos nas lojas (Play/App Store), Van intercidade, conectores Bling/Tiny, múltiplas paradas, agendamento, camada de IA.
