# Verificação de entregador — as "tomadas" (chegar e plugar)

O código de verificação está pronto e em no-op até as chaves existirem. Quando as contas forem criadas,
plugar = preencher as env vars (Vercel + `.env.local`) e confirmar endpoint/formato na doc de cada provedor.

> ⚠️ **Pré-requisito comum:** todos exigem cadastro **no CNPJ do dono** e, em geral, **e-mail corporativo**
> (não aceitam Gmail). idwall/Serpro são enterprise (têm prazo de aprovação). Antecedente e biometria são
> **dado sensível LGPD** — consentimento explícito do entregador + acesso só admin.

## As 4 checagens (combo do DOSSIÊ §3)
| Tipo | Provedor (tomada) | Arquivo | Env var | Custo |
|---|---|---|---|---|
| Antecedentes (CPF) | FlagCheck | `lib/verificacao/flagcheck.ts` | `FLAGCHECK_API_KEY` | ~R$3,33/consulta |
| CNH (Senatran) | Infosimples | `lib/verificacao/infosimples.ts` | `INFOSIMPLES_TOKEN` | por consulta (+franquia ~R$100/mês) |
| CRLV (veículo) | Infosimples | `lib/verificacao/infosimples.ts` | `INFOSIMPLES_TOKEN` | por consulta |
| Biometria/Face ID | idwall *(ou Unico/CAF/Serpro Datavalid)* | `lib/verificacao/idwall.ts` | `IDWALL_API_KEY` | contrato enterprise |

Mais a **re-verificação periódica** (Lei 13.640/2018 exige revalidar) — rodar `iniciarVerificacao` de novo a cada X meses.

## Como plugar (passo a passo, quando tiver a conta)
1. Criar a conta no provedor (CNPJ + e-mail corporativo) e pegar a chave de API.
2. Pôr a chave nas env vars (`.env.local` local + Environment Variables na Vercel).
3. Também setar **`SUPABASE_SERVICE_ROLE_KEY`** (server-only) — necessário pra gravar em `verificacoes` (RLS admin-only).
4. Confirmar **endpoint e formato da resposta** na doc do provedor e ajustar o mapeamento em cada arquivo (marcado com "confirmar na doc").
5. Criar o **bucket de Storage** (ex.: `documentos`) pro upload de CNH/CRLV/selfie e passar as URLs ao `iniciarVerificacao`.

## O que já está pronto (não precisa fazer)
- Orquestração: `actions/iniciarVerificacao.ts` (roda os 4, grava em `verificacoes`, marca `em_verificacao`).
- Tabela `verificacoes` + RLS **admin-only** (LGPD) — migrations 0001/0002.
- **Aprovação final manual no admin com PIN** (`actions/aprovarEntregador.ts`) + trava anti-auto-aprovação (0003/0004).
- Sem chave → o entregador entra em `em_verificacao` pra **revisão manual** no admin (não trava o cadastro).

## Decisão pro plano de negócio (investidor decide)
**Quem paga a verificação** (~R$5–15/entregador + recorrente): operação absorve (default atual) **ou** taxa de adesão do entregador.
