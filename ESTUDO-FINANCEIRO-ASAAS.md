# Estudo Financeiro — Fluxo de Dinheiro do AppDelyvery via Asaas

> Levantado em **27/06/2026** a partir de fontes oficiais do Asaas (docs.asaas.com, central.ajuda.asaas.com, asaas.com/precos-e-taxas) cruzadas com o código atual do app. Complementa o `MODELO-OPERACAO-E-DINHEIRO.md` do dossiê.
>
> **Dono do app = Tulio.** A conta Asaas é do CNPJ do Tulio. A Impulso só constrói. As taxas-base abaixo são oficiais; as **reais da conta do Tulio** podem diferir por negociação — confirmar em **Asaas → Taxas**.

---

## TL;DR — a resposta em 7 linhas

1. **Onde o dinheiro fica:** numa **conta Asaas única** (CNPJ do Tulio). Os "saldos" no app (carteira do lojista, saldo do entregador) são só números num **ledger interno** — o dinheiro real está todo na conta do Tulio.
2. **Retenção:** Pix é **D+0** (cai na hora, no saldo disponível). O Asaas **NÃO retém %** automático por transação (diferente de Stripe/PayPal). Retenção só existe se você **ligar a Conta Escrow** (opcional, paga) ou por bloqueio de violação.
3. **O que se paga:** **R$ 1,99 por recarga** recebida (Pix) + **R$ 0 a R$ 2,00 por saque** (Pix externo; 100 grátis/mês PJ). **Sem mensalidade** Asaas. **Split sem taxa extra.**
4. **A pegadinha que decide a arquitetura:** subconta Asaas (a forma "correta" de marketplace) **só funciona pra entregador CNPJ/MEI**. Entregador **PF não pode** ter subconta.
5. **O split automático do Asaas NÃO encaixa** no nosso modelo de carteira pré-paga (a recarga entra antes da entrega; não dá pra splitar pra um entregador que ainda não existe). Por isso o split é **ledger interno** (como o código já faz) e o repasse é transferência à parte.
6. **Risco regulatório:** no modelo conta-única, o Tulio **custodia o dinheiro do entregador** — isso pode caracterizar instituição de pagamento sem autorização BACEN. Subconta resolveria, mas trava no PF.
7. **Margem real:** o take de 20% é **bruto**. Tira ~R$ 1,99/recarga (amortizado entre as entregas daquele saldo) + eventual R$ 2,00/saque fora da franquia.

---

## 1. Onde o dinheiro fica (titularidade e custódia)

Hoje (modelo do código): **uma conta Asaas só, do CNPJ do Tulio.**

- Quando o lojista recarrega a carteira, o Pix cai **no saldo da conta Asaas do Tulio**.
- O `estabelecimentos.saldo_carteira` e o `entregadores.saldo` são **números num ledger** (tabela `carteira_transacoes` + triggers). **Não são contas** — é controle interno de "quanto desse bolo é de quem".
- Ou seja: o dinheiro do entregador (os 80% que ele "tem a receber") está **fisicamente na conta do Tulio** até ele sacar.

**Implicação (custódia de terceiro / comingled funds):** segurar dinheiro de terceiro na própria conta pode caracterizar **instituição de pagamento** e, sem autorização BACEN, é operação irregular. O Asaas criou subcontas e escrow exatamente pra esse cenário. **Isto é ponto de jurídico do Tulio** — não é decisão técnica nossa, mas ele precisa saber. (Inferência do contexto regulatório Res. BCB 80/2021 + Res. Conjunta 16/17; confirmar com advogado de pagamentos.)

---

## 2. Os 3 momentos do dinheiro (entra · fica · sai)

```
[LOJISTA]  --recarga Pix-->  [CONTA ASAAS do TULIO]  --saque Pix-->  [ENTREGADOR]
              R$1,99                 D+0, saldo                R$0–2,00
                              (ledger divide 80/20
                               internamente por entrega)
```

| Momento | O que acontece no código | Evento Asaas | Taxa |
|---|---|---|---|
| **Entra** (recarga) | `criarCobrancaPix(valor)` → webhook `confirmar_recarga` credita a carteira | Pix recebido, D+0 | **R$ 1,99** (R$0,99 nos 3 primeiros meses) |
| **Fica** (entrega concluída) | trigger `creditar_entregador` credita 80% no `entregadores.saldo`; 20% fica pra plataforma | **nenhum** (só ledger interno) | R$ 0 |
| **Sai** (saque) | `reservar_saque` → `transferirPix` pra chave externa do entregador → `finalizar_saque` | Transferência Pix externa | **R$ 0** (até 100/mês PJ) **/ R$ 2,00** depois |

---

## 3. O que é retido

- **Pix entra D+0**, direto no **saldo disponível** — sem float, sem "a liberar".
- **Asaas NÃO retém percentual automático** por transação. Não há reserva preventiva embutida.
- **Conta Escrow (opcional):** se quiser segurar o repasse do entregador até **confirmar a entrega**, dá — `daysToExpire` até 45 dias. Custo: **R$ 99,90/mês + R$ 9,90/subconta ativa**. Só faz sentido no modelo subconta.
- **Cartão** (se um dia aceitar): liquida em **D+32**; antecipação a partir de 1,25%/mês. Pix não tem isso.
- **Bloqueio involuntário:** só por violação (chargeback > 1% — e chargeback **não se aplica a Pix**; Pix contestado segue o MED do BACEN).

---

## 4. O que vamos pagar — tabela de taxas (oficial, confirmar na conta)

| Operação | Quem paga | Valor |
|---|---|---|
| Receber Pix do lojista (recarga) | plataforma (Tulio) | **R$ 1,99** /transação (R$0,99 nos 3 primeiros meses) |
| Pagar entregador — Pix externo, dentro da franquia | plataforma | **Grátis** (100/mês PJ¹) |
| Pagar entregador — Pix externo, fora da franquia | plataforma | **R$ 2,00** /transferência |
| Pagar entregador com **subconta** Asaas (interno) | plataforma | **Grátis e instantâneo** |
| TED pra banco externo | plataforma | R$ 5,00 |
| Criar / manter subconta | plataforma | **Grátis** |
| Split de pagamento | — | **Sem taxa extra** (taxa do Pix sai antes do split) |
| Mensalidade da plataforma Asaas | — | **R$ 0** (pay-per-use; sem plano) |
| Cartão crédito à vista (se usar) | — | R$ 0,49 + 2,99% |

¹ Há divergência entre fontes (30 vs 100 grátis/mês PJ) — **confirmar em Asaas → Taxas**. Pra PF a franquia de saída é ilimitada/grátis.

---

## 5. A decisão arquitetural — conta única × subconta por entregador

| Critério | **Conta única + repasse Pix** (atual) | **Subconta por entregador + repasse interno** |
|---|---|---|
| Complexidade | Baixa (já construído) | Média (criar subconta por entregador via API) |
| Custódia de terceiro | **Sim** (risco regulatório) | **Não** (Asaas detém a autorização BACEN) |
| Entregador **PF (CPF)** | ✅ aceita (Pix/TED pra chave externa) | ❌ **PF não pode ter subconta** |
| Entregador **MEI/CNPJ** | ✅ aceita | ✅ ideal |
| Custo do repasse | grátis até 100/mês, depois R$2 | **grátis sempre** (transferência interna) |
| Escrow (segurar até entregar) | não | sim |
| Onboarding | sem limite | trava: **60 dias** com máx 10 subcontas + R$2.000/subconta |

**O nó:** o split automático do Asaas (que joga 80% direto pra subconta no recebimento) **não encaixa** no nosso modelo de **carteira pré-paga** — a recarga entra antes da entrega, sem saber quem vai entregar. Logo, mesmo no modelo subconta, o split é **interno** e o repasse é uma **transferência interna** (raiz→subconta) na hora que a entrega conclui. A subconta agrega **regulatório + repasse grátis**, não o split-no-recebimento.

---

## 6. A variável que decide: PF × MEI/CNPJ do entregador

- Se os entregadores são **pessoa física (CPF)** → subconta **está fora**. O modelo possível é o **conta-única atual** (Pix externo no saque), com a ressalva de custódia que o jurídico do Tulio precisa avaliar.
- Se os entregadores forem **MEI/CNPJ** → abre o modelo subconta: repasse grátis, custódia limpa, escrow opcional.
- **Decisão do Tulio** (modelo de negócio): exigir MEI do entregador (comum em apps de entrega) muda a arquitetura e a postura regulatória.

---

## 7. Onde o código está × onde precisaria ir

**Hoje (conta única, ledger interno):**
- `recargas` + `confirmar_recarga` (Pix in) · `creditar_entregador` (split 80/20 no ledger) · `saques` + `transferirPix` (Pix out externo). `entregadores.asaas_subconta_id` **existe vazio** (slot reservado, nunca usado).
- Nada disso modela a **taxa do Asaas**: credita/transfere **valor cheio** → **o Tulio absorve a taxa** do take de 20%.

**Pra ficar fiel ao dinheiro real (quando a `ASAAS_API_KEY` entrar):**
1. **Registrar a taxa** em cada recarga/saque (campo `taxa` no ledger) pra a margem do Tulio ser real, não aparente.
2. **Decidir quem absorve** a taxa: plataforma (do take), repassa na recarga, ou desconta no saque. (Decisão do Tulio.)
3. **Se for modelo subconta:** ligar `asaas_subconta_id` (criar via `POST /v3/accounts`, guardar `walletId`), repasse interno grátis no `creditar_entregador`.
4. **Limite de saque:** novo PJ tem teto de **R$ 5.000/transferência** Pix (ajustável na conta).

---

## 8. Recomendação

1. **Curto prazo (MVP, entregador PF):** seguir no **conta-única** (já construído). É o único que funciona com entregador PF. **Adicionar o registro da taxa** no ledger pra a margem ser honesta. Sinalizar ao Tulio a **questão de custódia** (jurídico).
2. **Quando escalar / formalizar:** avaliar **exigir MEI do entregador** → migrar pra **subconta + repasse interno grátis** (mais barato e regulatoriamente limpo). Considerar **Escrow** só se quiser segurar repasse até confirmar entrega.
3. **Otimização de taxa** (qualquer modelo): incentivar **recarga maior e menos frequente** (a taxa de R$1,99 é fixa, dilui melhor) e **agrupar saques** (ficar na franquia gratuita).

---

## 9. Modelo de saque recomendado — CPF paga, MEI grátis (campos de config prontos)

Política que alinha custo + regulatório + incentivo de uma vez (decisão final do Tulio; já deixada **configurável** no código, no-op até a chave Asaas):

- **CPF (sem subconta):** taxa fixa por saque — `config.saque_taxa_cpf` (default **R$ 3,50**), descontada do valor. Cobre o custo do Asaas (R$0–2) e ainda sobra margem; e fica **abaixo da Uber (R$4,50)**.
- **MEI (com `asaas_subconta_id`):** saque **grátis** (`config.saque_mei_gratis = true`) — repasse interno, custo zero. Vira **incentivo a formalizar**.
- **Mínimo:** `config.saque_minimo` (default **R$ 35**, igual Uber) — não pela taxa, mas pra **segurar a franquia**: mínimo alto = menos saques = fica nos 100 grátis/mês por muito mais tempo.
- **Mostrar a escolha pro entregador** (tela de saque + onboarding): *"Saque CPF: R$3,50 · Vire MEI e saque sem taxa"*. Reframe: não é penalidade, é upgrade.

**Por que funciona (alinhamento de incentivo):** a franquia de 100 transferências/mês é da conta inteira do Tulio. Com saque grátis instantâneo, **~4 entregadores sacando todo dia já estouram os 100**. A taxa do CPF morde mais quem saca com frequência — que é **exatamente quem mais custa** — e empurra justo esse perfil pro MEI. Quem saca direto (26×/mês × R$3,50 = R$91/mês) economiza virando MEI (DAS ~R$70); quem saca pouco acumula (o mínimo força isso).

**Ressalva honesta:** o "MEI grátis" só vira **custo-zero real** pro Tulio quando a **subconta estiver implementada** (hoje `asaas_subconta_id` é coluna vazia; saque de MEI ainda sairia como Pix externo). Antes disso, o grátis-pro-MEI é **política absorvida**, não economia. O incentivo já funciona; a economia chega com a subconta.

**Status no código:** campos `saque_minimo`/`saque_taxa_cpf`/`saque_mei_gratis` na `config` (migration 0049, aplicada e provada); `reservar_saque` lê o mínimo da config; `actions/saque.ts` desconta a taxa se não houver subconta e transfere o líquido. Tudo no-op até `ASAAS_API_KEY`.

---

## Fontes
- Preços e taxas: https://www.asaas.com/precos-e-taxas · https://blog.asaas.com/taxas-asaas/
- Pix (recebimento/transferência): https://www.asaas.com/pix-asaas · https://central.ajuda.asaas.com/hc/pt-br/articles/32040230167067
- Split de pagamentos: https://docs.asaas.com/docs/split-de-pagamentos · https://docs.asaas.com/docs/duvidas-frequentes-split
- Subcontas: https://docs.asaas.com/docs/criacao-de-subcontas · https://docs.asaas.com/reference/criar-subconta
- Transferência entre contas: https://docs.asaas.com/docs/transferencia-para-conta-asaas
- Conta Escrow: https://docs.asaas.com/docs/introducao-conta-escrow · https://blog.asaas.com/conta-escrow-asaas/
- Liquidação/antecipação: https://blog.asaas.com/compensacao-de-pagamento/ · https://central.ajuda.asaas.com/hc/pt-br/articles/38743848617755
