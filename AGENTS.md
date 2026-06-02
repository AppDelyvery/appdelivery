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
Scaffold + design system + esqueleto de pastas do blueprint feitos. **Fatia pronta:** fluxo do
negócio `/negocio/novo-pedido` (form → matching → tracking → done) com mapa Mapbox + simulação
GPS. Entregador/admin/rastreio/auth são placeholders (`EmBreve`). Próximas fatias: cadastro+
verificação do entregador, painel admin, tela pública do cliente final, e wire do Supabase.
