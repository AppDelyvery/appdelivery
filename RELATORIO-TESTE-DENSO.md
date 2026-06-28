# Relatório — Teste de operação densa (Palmas-TO) · 27/06/2026

Simulação ponta-a-ponta da plataforma pelos **fluxos reais** (signup/REST/RPCs, RLS + triggers),
seguida de auditoria multi-agente em 7 dimensões. Tudo marcado com prefixo `sim.` (removível por
`scripts/cleanup-sim.sql`).

## Escala simulada
- **200 estabelecimentos** + **30 entregadores** (18 moto, 6 carro, 3 van, 3 bike) — endereços reais de Palmas
- **~530 pedidos**: ~510 entregues + aceito/coletado/buscando/cancelado
- **~1.900 mensagens** de chat 3-pontas, ~480 avaliações, 48 disputas resolvidas, ~30 saques
- Dinheiro: split 80/20 exato, R$855 take + R$3.435 repassado, estornos casados

## O que está SÓLIDO (auditado, sem furo)
- **Split 80/20**: exato em todo pedido com preço válido (desvio < 1 centavo); `take_rate=0.200` confere
- **Estorno de cancelamento**: débito + crédito casados (net zero); cancelado de 'buscando' nunca cobrado
- **Saques**: mínimo R$35 respeitado, nenhum acima do saldo, nenhum saldo negativo
- **Máquina de estados**: 0 estados impossíveis (timestamps, entregador_id, codigo coerentes)
- **RLS/LGPD**: 0 cross-tenant; `listar_corridas_disponiveis` não vaza dado do cliente; antecedentes/docs só admin
- **Cron de ofertas**: expiração em dia, sem órfãs
- **Abandonos** (heartbeat anti-fantasma): contados certo e alimentam o ranking

## Bugs REAIS corrigidos (migrations 0051 + 0052 — aplicadas e provadas)
| # | Bug | Fix | Prova |
|---|-----|-----|-------|
| 1 | `total_entregas` nunca incrementava (UI mostra 0 em 3 telas) | `creditar_entregador` conta a entrega + guard libera a função de sistema via flag | total_entregas == entregue real (511=511) |
| 2 | `aceitar_corrida` nunca marcava a oferta como 'aceita' (ciclo morria em 'expirada') | marca 'aceita' + expira as demais ofertas do pedido | oferta vira 'aceita' no aceite |
| 3 | Sobre-atribuição (entregador com 2+ entregas ativas) | invariante "1 ativo por vez" no `aceitar_corrida` (retorna 'ocupado') | 0 entregadores com 2+ (era 6) |
| 4 | Chat: `autor_id` NULL em 100% (autoria forjável — não-repúdio LGPD) | trigger fixa `autor_id = auth.uid()` no insert autenticado | trigger ativo |
| 5 | Disputas resolvidas sem `resolvida_at` (sem SLA) | trigger seta `resolvida_at` ao resolver + backfill | 48/48 com data |
| 6 | `rating` travado em 5.0 (guard revertia o recálculo das funções de sistema) | guard libera via flag; recálculo passa | rating de estabelecimentos varia 4.0–5.0 |

**Causa raiz comum (#1 e #6):** o trigger `guard_entregador_update` revertia `total_entregas` e `rating`
até para as funções de sistema (que rodam no contexto não-admin do entregador). Corrigido com flag de
sessão `app.sys_entregador` (só funções `SECURITY DEFINER` ligam; entregador segue sem auto-editar).

> Nota: o "rating não reflete" foi parcialmente um falso-positivo da auditoria — `registrar_avaliacao`
> filtra `created_at < current_date` (avaliação **D+1 por design**: conta a partir do dia seguinte). O bug
> real era o guard revertendo a escrita; isso sim foi corrigido.

## FLAGS — precisam da sua decisão (não corrigi unilateralmente)
1. **Aceite não é "gated" por oferta** — qualquer entregador elegível pega o pedido da lista (modelo *pull*),
   a oferta direcionada vira consultiva. É decisão de produto (pull vs push). Com o fix #3 o pull já fica
   "1 por vez". Se quiser fila estrita, exigir oferta válida no aceite.
2. **`rastreios` sem writer** — o GPS ao vivo é só broadcast efêmero, nunca gravado. `get_rastreio_publico`
   devolve lat/lng NULL → o mapa do cliente não mostra o pino fora da janela de broadcast ativo. Decidir:
   (a) amostrar posição no banco a cada 15-30s, ou (b) assumir broadcast-only e ajustar a UI.
3. **2 pedidos 'entregue' com preço NULL** (dados de teste antigos de 02/06) — a verificação de split é cega a
   NULL. Sugiro `CHECK`/`NOT NULL` nos preços quando status='entregue' (não apliquei p/ não quebrar dado legado).
4. **Captcha** — o secret do Turnstile no Supabase não bate com o site key (login/cadastro quebram). Está
   **desligado** agora pra testar. Religar só depois de acertar o secret (Cloudflare hostname + Supabase).
5. **`cobranca_ativa` = true** — liguei pra testar o dinheiro (sem Asaas nada real se move). Decidir se fica.
6. **Admin `/negócios`**: 216 linhas sem paginação/busca — renderiza, mas em escala maior trava (UX).

## Não-testável até as chaves externas (Asaas / verificação)
- **Recarga** de carteira (Pix), **saque → 'pago'** (todos em 'processando'), confirmação de **pagamento** por
  webhook, **split via Asaas** — dependem de `ASAAS_API_KEY`.
- **Verificação** de antecedentes/CNH/CRLV — depende das chaves FlagCheck/Infosimples/idwall. Os 30
  entregadores nasceram 'aprovado' sem linha em `verificacoes` (selo "verificado" hoje se apoia só no status).

## Cobertura não exercitada (baixo esforço pra fechar)
`comunicados`, `entregador_documentos`, `verificacoes`, `recargas`, `rastreios` ficaram vazias.

## Como reproduzir / limpar
- Criar contas em massa: `EST_N=200 ENT_N=30 node scripts/seed-massa.mjs`
- Rodar a operação: `PED_N=500 node scripts/sim-driver.mjs` (resumível: `PHASE=advance`)
- Auditar: Workflow `scripts/audit-gaps.mjs`
- **Limpar tudo**: `node scripts/db.mjs scripts/cleanup-sim.sql`
