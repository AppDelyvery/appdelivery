# APPDELYVERY — Plano de Entrega (setup R$15k)

> Roteiro de trabalho pra entregar a **plataforma pronta pra operar** (o setup contratado).
> Cruza o que foi **vendido** (plano de negócio) com o **estado real** (auditoria de código+banco, 08/06).
> Companion do `CHECKLIST-PROGRESSO.md` (esse é o "onde estamos"; este é o "como chegar").

## Definition of Done do SETUP (o que o cliente recebe por R$15k)
A plataforma rodando ponta a ponta com **dinheiro real circulando** e **entregador verificado de verdade**:
1. Lojista recarrega por Pix → cria entrega → entregador aceita → coleta/entrega com comprovante → entregador recebe.
2. Entregador novo passa por antecedentes + CNH + biometria reais antes de rodar.
3. Avisos chegam (entregador sabe da corrida, cliente recebe o link).
4. Termos/privacidade válidos + domínio próprio.

Tudo que está fora disso = **Fase 2 (cobrada à parte)** — lista no fim.

---

## FASE 1 — Ligar a VERIFICAÇÃO (o diferencial) · rápido, destrava valor
Pré-requisito: contas no CNPJ do dono + chaves.
- [ ] **Infra:** criar contas FlagCheck, Infosimples, idwall no CNPJ do dono (idwall exige e-mail corporativo)
- [ ] **Infra:** preencher `.env.local` + Vercel: `FLAGCHECK_API_KEY`, `INFOSIMPLES_TOKEN`, `IDWALL_API_KEY`, **`SUPABASE_SERVICE_ROLE_KEY`** (hoje vazia — necessária pro server-side)
- [ ] **Backend:** as tomadas já existem (`lib/verificacao/*`, `actions/iniciarVerificacao.ts`) — só validar que rodam com as chaves
- [ ] **Banco/Telas:** já prontos (status de verificação, painel admin de aprovação)
- [ ] **DoD:** cadastrar um entregador de teste → verificação real roda → admin vê resultado → aprova. Provar por `scripts/verify-*`.

## FASE 2 — PAGAMENTO real (Asaas) · a maior peça, é o que faz faturar
Hoje só existe o webhook esqueleto (501). Falta construir.
- [ ] **Infra:** conta Asaas no CNPJ do dono + `ASAAS_API_KEY` + `ASAAS_WEBHOOK_TOKEN`
- [ ] **Backend:** client Asaas (`lib/asaas.ts`); criar subconta do entregador no cadastro/aprovação
- [ ] **Backend:** recarga da carteira por Pix (cria cobrança Asaas → credita saldo no retorno do webhook)
- [ ] **Backend:** split 80/20 na conclusão da entrega (entregador/plataforma)
- [ ] **Backend:** repasse D+1 pro Pix do entregador (saque)
- [ ] **Backend:** `/api/webhooks/asaas` real (confirma pagamento → credita; hoje 501)
- [ ] **Banco:** tabelas `pagamentos`/`carteira_transacoes` já existem; revisar se cobrem split/repasse
- [ ] **Telas:** ativar botão "Adicionar saldo" (hoje `disabled`) + extrato da carteira no lojista; tela de saque/ganhos do entregador
- [ ] **DoD:** lojista recarrega Pix de verdade → saldo sobe → entrega desconta → entregador vê crédito → saca. Provar na fonte (read-after-write).

## FASE 3 — NOTIFICAÇÕES (SMS/WhatsApp + push)
- [ ] **Decisão:** escolher provedor de SMS/WhatsApp (ex. Zenvia) — credencial no CNPJ do dono
- [ ] **Backend:** enviar **SMS/WhatsApp com o link de rastreio** pro cliente final ao despachar
- [ ] **Backend:** **push** de nova corrida pro entregador (hoje é polling) — Web Push/FCM
- [ ] **Banco:** (se preciso) log de envios
- [ ] **DoD:** cliente recebe o link no celular; entregador recebe alerta de corrida sem estar com o app aberto.

## FASE 4 — ENTREGA / polimento final
- [ ] **Jurídico:** termos de uso + privacidade revisados por advogado (dado sensível de antecedentes = LGPD) — hoje são rascunho
- [ ] **Infra:** domínio próprio (ex. appdelyvery.com.br) — hoje a URL é `appdelivery-...` (com "i"; a marca é com "y")
- [ ] **Telas:** confirmar que o que já está no banco aparece pro lojista — **retorno** (0026), **cotação de preço** (0025), **proteção de carga** (0027). Banco pronto; validar exposição na UI.
- [ ] **Telas:** validação visual final no celular (90% dos acessos são mobile)
- [ ] **Banco:** rodar `scripts/cleanup-teste.sql` (limpar dados de teste antes de entregar)
- [ ] **DoD:** abrir o app no celular como cliente real, do cadastro à entrega, sem nada de "demo".

---

## AJUSTES POR CAMADA (visão transversal)

| Camada | Situação | O que falta |
|--------|----------|-------------|
| **Banco** | Muito completo (27 migrations, ~18 tabelas, ~30 RPCs, guards) | Quase nada estrutural — revisar `pagamentos`/`carteira` p/ split+repasse; talvez log de notificações |
| **Backend / integrações** | Mapbox + Supabase reais; resto é tomada no-op | **Construir Asaas** (grande), **ligar verificação** (chaves), **criar SMS/push** (novo), webhook Asaas real |
| **Telas / UX** | 3 personas + admin + cliente, todas no ar | Ativar recarga+extrato (depende Asaas); expor retorno/cotação/proteção no lojista; passada final mobile |
| **Infra / jurídico** | Deploy contínuo, PWA, SEO ok | Chaves no CNPJ, domínio, termos com advogado, limpeza de teste |

---

## FORA DO SETUP — Fase 2 (evolução, cobrar à parte)
Do GAP-FUNCIONALIDADES + roadmap do plano, o que NÃO foi vendido no setup:
- Pagamento **faturado/pós-pago CNPJ** (trunfo p/ conta grande)
- **Agendamento / recorrência** de entregas
- **Múltiplas paradas** (1 coleta → várias entregas)
- **Devolução / return trip** + **dados do recebedor** (nome/CPF na entrega)
- Instruções de entrega, endereços favoritos, tipos de entrega (express/agrupada)
- **Apps nativos** (Play Store + App Store, via Expo)
- **Van intercidade** (Porto/Gurupi)
- **Conectores** Bling/Tiny/PDV de farmácia
- **Camada de IA** (previsão de demanda, ETA preditivo, antifraude)
- Seguro de carga com **apólice/parceiro real** (hoje só o teto de cobertura no banco)
