# Relatório da madrugada — APPDELYVERY (02/06/2026)

Bom dia, Eduardo. Resumo do que rodei enquanto você dormia. Tudo verde (tsc + eslint + build) e no GitHub.

## ✅ TO-DO DA MANHÃ (só você consegue fazer)
1. **Rodar 3 migrations** no SQL Editor do Supabase, **nesta ordem**:
   - `supabase/migrations/0004_security_hardening.sql` — FECHA 2 furos de segurança (críticos).
   - `supabase/migrations/0005_vehicle_van.sql` — adiciona o veículo "van".
   - `supabase/migrations/0006_mensagens.sql` — chat por pedido (3 pontas, incl. cliente final).
2. **Seed do admin** (1 linha, no fim do 0004): `update profiles set role='admin' where id='<seu-uuid>';` (pega o uuid do seu usuário em Authentication → Users). Sem isso, ninguém aprova entregador.
3. **(opcional) Limpar dados de teste:** rodar `scripts/cleanup-teste.sql` (criei vários usuários de teste nas provas).
4. **Validar `baseVan`** em `lib/precos.ts` — pus R$20 de placeholder pro preço da van; me diz o valor real.
5. **Deploy Vercel** (importar repo + 3 env `NEXT_PUBLIC_*`) e contas Asaas/FlagCheck/Infosimples/Zenvia no CNPJ do dono — quando quiser.
6. **Olhos:** validar visualmente o **site** (`/`) e as telas (a parte mais dependente de gosto).

## O que fiz e PROVEI na fonte
- **Auditoria de segurança adversarial** (`scripts/audit-rls.mjs`): ataquei o banco como usuário malicioso.
  - ✅ Travado: ler/adulterar dados de outro lojista, ler verificações (LGPD).
  - ❌ **2 furos achados e provados** → corrigidos na `0004` (a aplicar):
    - `self-promote-admin`: qualquer um setava o próprio `role='admin'` e lia tudo. **(crítico)**
    - `owner-status-tamper`: lojista marcava o próprio pedido como `entregue` sem evidência.
- **Aprovação do entregador** (`scripts/verify-admin-approve.mjs`): entregador → `em_verificacao` → **admin aprova** → `aprovado`. ✅ A aprovação cai na tela do Admin; só admin aprova (garantido pela 0003).
- (ontem) cadastro lojista + entregador gravando, `criarPedido`, rastreio público — todos provados.

## O que construí (código, build verde)
- **Chat por pedido (3 pontas):** lojista + entregador (autenticados) + **cliente final pelo link, sem app** (funções por token). `lib/chat.ts` + `ChatBox` + wire no acompanhamento e na tela pública. Prova (`verify-chat.mjs`) espera a `0006`. Entregador entra na thread quando a corrida for atribuída (próxima fatia).
- **Site institucional** na raiz `/` (`components/site/Landing.tsx`) — hero, diferencial (antecedentes), como funciona, CTA. Posicionamento corrigido: ancora em **antecedentes**, GPS como feature, **zero "único/primeiro"** (a Bee tem GPS em Palmas — ver RECON).
- **Legal:** `/termos` e `/privacidade` (LGPD, com foco no dado sensível de antecedentes). ⚠️ **RASCUNHO — precisa de advogado** antes de publicar; placeholders `[RAZÃO SOCIAL/CNPJ/DPO]` pra preencher.
- **Veículos:** moto / carro / **van** (tirei bike). Ícone de van + preço + seletores.
- **Admin:** `actions/aprovarEntregador.ts` (aprova com PIN; configure `ADMIN_PIN`).
- **Hardening:** `0004` (guards anti-escalonamento e anti-status-sem-evidência).

## Como reverificar (depois de rodar as migrations)
```
cd C:/Users/Usuario/appdelyvery
U="https://cqmxjzrukbagvkznrunt.supabase.co" K="<publishable>" node scripts/audit-rls.mjs
# esperado pós-0004: self-promote-admin e owner-status-tamper viram ✅ (travados)
```

## Próximas fatias (quando voltarmos)
- Fila de aprovação do admin **real** na tela (hoje a UI lista nomes fixos) + modal de PIN.
- Verificação real: FlagCheck (antecedentes) + Infosimples (CNH) **server-side com service role**.
- Wire do `lib/realtime.ts` com dado real (entregador transmite GPS → lojista/cliente veem ao vivo).
- `proxy.ts` (refresh de sessão), SMS (Zenvia), push.

## Travado em terceiros (não dependem de mim)
Deploy Vercel · contas Asaas/FlagCheck/Infosimples/Zenvia (CNPJ do dono) · MCP do Supabase (ficou com setup issue de OAuth) · validação visual (olhos).
