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

## Estado do build (auditado 27/06/2026)
> Fonte detalhada e marcável: **`CHECKLIST-PROGRESSO.md`** (raiz). Este é o resumo.
> O `MORNING-REPORT.md` é snapshot histórico de 02/06 — **NÃO** usar como estado atual.
> Números abaixo = auditoria de código+migrations de 27/06 (não do banco ao vivo; sem service-role não houve prova na fonte).

**★ CONTRATADO (08/06):** cliente fechou o app por **R$ 15.000 (setup, valor cheio)**; entrada **R$ 5k** + parcelas; mensalidade a acertar; doc de vendas no **CNPJ da Impulso** a assinar. Saiu de pitch → entrega.

**NO AR e provado:** deploy contínuo Vercel (push `main`) → **appdelivery-psi.vercel.app**. Auth real (cadastro/login) + **redirect por papel** + PWA (`start_url:/login`, fix commit `508d62b`). Supabase `cqmxjzrukbagvkznrunt`, **45 migrations no repo (0001–0045)**, RLS + guards (anti self-promote, status só com evidência, entregador não se auto-aprova, anti-spoof chat), ~22 tabelas, ~42 RPCs, PostGIS. `.env.local` tem Mapbox + Supabase URL/anon + **VAPID (web push)**; **`SUPABASE_SERVICE_ROLE_KEY` está VAZIA** (e Asaas/verificação também sem chave).

**3 personas COMPLETAS no ar (não são mais placeholders/simulação):**
- **Negócio** (12 telas): novo-pedido+mapa, histórico, carteira+recarga Pix, perfil, comunicados, avaliações, relatórios/CSV, integração API, equipe multi-usuário, config, ajuda+disputa.
- **Entregador** (8 telas): cadastro→verificação→oferta→coleta→rota→entrega, ganhos, carteira+saque, perfil, comunicados, avaliações, config, ajuda.
- **Admin** (12 telas): dashboard, despacho ao vivo, corridas+comprovante, entregadores+aprovação(PIN), negócios, financeiro, rankings, avaliações, mensagens, disputas, comunicados, config.
- **Cliente final**: `/rastreio/[token]` (sem login) + GPS ao vivo + chat + avaliação. `(auth)/login` e `/cadastro` são REAIS.

**Motor e recursos:** oferta dirigida (ranking distância×nota×confiabilidade, timer 30s, cascata, aceite atômico) + cron; heartbeat anti-fantasma (120s) + score confiabilidade; **API de integração** (criar pedido + cotação + webhook HMAC, provada no ar); GPS ao vivo (Realtime); preço por veículo + parada extra + espera; comprovação foto+assinatura+código + geofence; cancelamentos+estorno, chat 3-pontas, proteção de carga; avaliações D+1; **web push (oferta/status)**.

**Contas demo (senha `Demo1234`):** `demo.admin@gmail.com` (admin), `demo.negocio@gmail.com`, `demo.entregador@gmail.com` — redirect por papel testado em produção (Playwright).

**FALTA pra "operar de verdade" (detalhe no CHECKLIST):**
1. **`SUPABASE_SERVICE_ROLE_KEY`** vazia — destrava verificação server-side, convite de equipe, webhook de recarga **e a prova na fonte**. O mais barato e o que mais destrava.
2. **Asaas (pagamento)** — código PRONTO (cobrança Pix + transferência + webhook `confirmar_recarga` real + split 80/20 automático na entrega via trigger 0032 + saque 0033 + extrato 0039). Falta: `ASAAS_API_KEY` + `ASAAS_WEBHOOK_TOKEN` + ligar `config.cobranca_ativa` + provar end-to-end no sandbox. NÃO é mais 501.
3. **Verificação** (FlagCheck/Infosimples/idwall) — código pronto (no-op sem chave); falta as **chaves no CNPJ do dono**.
4. **SMS/WhatsApp** — ausente (definir provedor; web push já cobre entregador/lojista logados).
5. **Jurídico:** termos/privacidade são rascunho (advogado, LGPD); domínio próprio (`appdelyvery.com.br`, marca com "y").
