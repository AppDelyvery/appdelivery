<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# APPDELYVERY — contexto do projeto

App de **entrega de encomendas B2B sob demanda** em Palmas-TO. Diferencial: **entregador
verificado por antecedentes**. 4 atores: negócio, entregador, cliente final, admin.
Concorrente local: TôNoLucro (não checa antecedentes).

**Spec completa** (não redescobrir): `C:/Users/Usuario/segundo-cerebro/2-PROCESSAMENTO/app-entregas-b2b/`
— ler `INDEX.md` → `build-spec/01-BLUEPRINT-NEXTJS.md` → docs irmãos sob demanda
(02-banco, 03-back, 04-front, SISTEMA-GPS, INTEGRACAO-MAPBOX, FLUXO-COMUNICACAO).

## Stack
Next 16 (App Router, `app/` na raiz, sem `src/`) + TS + Tailwind v4 (tokens em `@theme`
no `globals.css`) + React 19. Mapbox GL (conta `appdelivery`). Supabase/Asaas/FlagCheck/
Infosimples entram por env var (plugáveis) — `lib/integracoes.ts` e `lib/mapbox.ts`.

## Contas DEDICADAS (não misturar)
Gmail/GitHub/Supabase/Vercel/Mapbox próprios do APPDELYVERY — **NÃO** usar systempalace/Impulso.
Mesmo modelo do Palace. **Esta vira a 3ª conta gh:** rodar `gh auth status` e confirmar a
conta ativa ANTES de qualquer push (`gh auth switch` se preciso). Token nunca em URL/chat.

## Design system (portado do protótipo)
Inter · índigo `#4f46e5` / verde `#059669` / navy `#0d1424`. **Zero emoji** — todo ícone é
SVG inline em `components/Icons.tsx` (`<Icon name="..." />`). Classes visuais em `globals.css`.

## Regras duras (valem no build)
- **Read-after-write** em todo write crítico (pedido, pagamento, aprovação) — UI verde não é prova.
- **Migration antes do push**; `npx tsc --noEmit` + `next build` local antes de deploy.
- **RLS sem subquery na própria tabela** → função `SECURITY DEFINER`.
- **Antecedentes = dado sensível (LGPD)**: só admin, nunca exposto ao negócio nem em URL/print.
- **Não gravar cada ping de GPS**: posição ao vivo via Realtime Broadcast; só amostra em `rastreios`.
- **Mobile e desktop**: mesmo componente, responsivo; nunca arquivo separado.

## Estado do build (atualizado nesta sessão)
Scaffold + design system + estrutura do blueprint. **Personas portadas (UI, demo/simulada):**
- `negocio/novo-pedido` — form → matching → tracking → done (Mapbox + sim GPS).
- `entregador` — cadastro → verificação → oferta → coleta → rota → finalizar → concluído (mapa em coleta/rota).
- `admin` — KPIs + entregadores + fila de aprovação + diferencial.
- `rastreio/[token]` — tela pública do cliente final (read-only, mapa ao vivo + status).

Arquitetura: `useSim` (motor de simulação), `MapaAoVivo` e `AppShell` são orientados a props/
reutilizados pelas 3 personas; cada persona tem seu Context. `(auth)/login|cadastro` ainda são
placeholders (`EmBreve`) — auth real é a próxima fatia.

**Supabase CONECTADO (02/06):** projeto `cqmxjzrukbagvkznrunt` (https://cqmxjzrukbagvkznrunt.supabase.co),
migrations `0001`/`0002` aplicadas, RLS ativo, função pública `get_rastreio_publico` respondendo —
verificado por REST/RPC com a publishable key (`sb_publishable_...`, formato novo, faz papel de anon).
`.env.local` (gitignored) tem `NEXT_PUBLIC_MAPBOX_TOKEN` + `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
MCP do Supabase configurado em `.mcp.json` mas ficou com setup issue (OAuth) — opcional, não bloqueia.
Config Auth: **Email provider ON + Confirm email OFF** (necessário pro signup devolver sessão).

**PROVADO na fonte (02/06):** cadastro lojista (`auth.users`+`profiles`+`estabelecimentos`) e
`criarPedido` (grava `pedidos` status 'buscando' + tracking_token) e **rastreio público** (anon acha
o pedido por token via `get_rastreio_publico`) — tudo verificado por `scripts/verify-auth.mjs` e
`scripts/verify-fluxo.mjs` no banco real, RLS ativo. `/cadastro` e `/login` reais; `actions/criarPedido.ts` real.

**Próxima fatia:** (1) auth-gate da área `/negocio` + chamar `criarPedido` pelo form (com coords reais via
Directions/Geocoding) em vez da simulação; (2) cadastro+verificação do entregador gravando; (3) wire do
`lib/realtime.ts` com dado real (entregador transmite GPS → lojista/cliente recebem); (4) SMS (Zenvia, CNPJ do dono) + push.
Pendência menor: limpar registros de teste no banco (Otica Teste/Fluxo). Deploy Vercel: importar repo + 3 env `NEXT_PUBLIC_*`.
