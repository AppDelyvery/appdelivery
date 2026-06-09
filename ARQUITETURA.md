# APPDELYVERY — Arquitetura do Sistema

> Como a plataforma é montada por dentro: stack, camadas, fluxos, banco, segurança e integrações.
> Estado real em 08/06/2026 (auditoria de código+banco).

## 1. Stack (o que usamos)

| Camada | Tecnologia | Papel |
|---|---|---|
| App + Site | **Next.js 16** (App Router) + React 19 + TypeScript + Tailwind v4 | As 4 telas + vitrine, um app só por papel; PWA instalável |
| Banco + Auth | **Supabase** (PostgreSQL + PostGIS) | Dados, login, regras de acesso (RLS), tempo real, arquivos |
| Lógica de negócio | **Server Actions** + **RPCs `SECURITY DEFINER`** no Postgres | Cérebro no banco (despacho, preço, guards) |
| Hospedagem | **Vercel** | Deploy contínuo (push na `main` → no ar) |
| Mapas/rotas | **Mapbox** (Directions + Geocoding) | Rota real pelas ruas, endereço, distância |
| Pagamento | **Asaas** (Pix/split) | Carteira, split 80/20, repasse — *a ligar* |
| Verificação | **FlagCheck + Infosimples + idwall** | Antecedentes + CNH/CRLV + biometria — *a ligar* |
| Notificação | SMS/WhatsApp + Push | Avisos — *a definir/construir* |

## 2. Camadas (visão de cima)

```
   NEGÓCIO        ENTREGADOR        ADMIN        CLIENTE FINAL
  (/negocio)     (/entregador)    (/admin)     (/rastreio/token)
      |                |              |                |
      +--------- PWA / Navegador (mobile-first) -------+
                          |
                 VERCEL  ·  Next.js 16
        (páginas + Server Actions + /api/v1 público)
                          |
                 SUPABASE  ·  PostgreSQL + PostGIS
   Auth · RLS · RPCs (SECURITY DEFINER) · Realtime · Storage
                          |
   +----------+-----------+-----------+--------------+
   |          |           |           |              |
 Mapbox     Asaas    FlagCheck    Infosimples      idwall      (+ SMS/push)
 (rotas)   (pgto)*   (antec.)*    (CNH/CRLV)*    (faceID)*
                          * = a ligar (tomada pronta, sem chave)
```

## 3. Os 4 atores (mesmo sistema, rota por papel)

O login lê `profiles.role` e redireciona: `estabelecimento → /negocio`, `entregador → /entregador`, `admin|operador → /admin`. O cliente final não tem login — entra por **link com token** (`/rastreio/[token]`).

- **Negócio** — cria entrega (3 veículos + preço + endereço), acompanha, histórico, carteira, relatórios, API.
- **Entregador** — cadastro→verificação→oferta→coleta→rota→entrega; ganhos; perfil.
- **Admin** — despacho ao vivo, corridas, aprovação de entregador (PIN), financeiro, config, comunicados.
- **Cliente final** — rastreio por link, GPS ao vivo, chat, código de entrega.

## 4. Modelo de dados (núcleo)

`profiles` (papel) → `estabelecimentos` / `entregadores` → **`pedidos`** (centro de tudo) →
`ofertas`, `rastreios` (GPS), `comprovantes` (foto/assinatura), `pagamentos`, `avaliacoes`,
`carteira_transacoes`, `mensagens` (chat 3-pontas), `cancelamentos`, `disputas`,
`comunicados`, `chaves_api`, `config` (preços/take/PIN/raio singleton).
**27 migrations**, RLS em todas, PostGIS para geolocalização.

## 5. Fluxos principais

**A) Entrega (manual):**
`lojista cria → status 'buscando' → trigger dispara o motor → ofertar_proximo (ranking distância×nota, timer 30s) → entregador aceita (atômico) → coleta (foto + geofence) → rota (GPS ao vivo via Realtime) → entrega (foto + assinatura + código 4 díg) → 'entregue' + split 80/20`.

**B) Entrega (via API — clientes grandes):**
`sistema do lojista → POST /api/v1/pedidos (chave) → criar_pedido_via_api (preço calculado no banco) → mesmo motor de oferta → webhook HMAC devolve status`.

**C) Rastreio do cliente:**
`link com token → get_rastreio_publico (status + entregador + posição) → GPS ao vivo (Realtime) → chat por token`.

**D) Verificação do entregador:**
`cadastro → iniciarVerificacao (FlagCheck + Infosimples + idwall, server-side) → grava em verificacoes (só-admin, LGPD) → admin aprova com PIN`.

**E) Pagamento (a construir):**
`carteira pré-paga (recarga Pix via Asaas) → desconta na criação → split 80/20 na conclusão → repasse D+1 pro entregador`.

## 6. Motor de despacho (oferta dirigida — modelo 99)
Cérebro em funções Postgres + PostGIS. `ofertar_proximo` ranqueia por **distância real × nota** (placar adaptativo: quem entrega bem sobe). Oferta dirigida com cronômetro (~30s); recusou/expirou → cascata pro próximo. Aceite **atômico** (nunca corrida dupla). `processar_ofertas` roda por **cron** (expira/reativa). Parametrizável por cidade (raio, pesos, preço) — base pra escalar pra outras praças.

## 7. Segurança & LGPD
- **RLS** em todas as tabelas; helpers `is_admin()`/`auth_role()` SECURITY DEFINER (sem recursão).
- **Guards (triggers):** anti self-promote a admin; status crítico (coletado/entregue) só com evidência (foto/assinatura); entregador não se auto-aprova.
- **Antecedentes = dado sensível:** tabela `verificacoes` só-admin, nunca exposto ao negócio/cliente nem em URL.
- **Acesso público por token** (rastreio/chat) via SECURITY DEFINER que devolve só o necessário.
- **API:** chave com hash SHA-256; webhook assinado (HMAC); preço sempre recalculado no servidor.

## 8. Integrações (status real)

| Integração | Status | Falta |
|---|---|---|
| Mapbox | **Ligada** | — |
| Supabase | **Ligada** | — |
| FlagCheck / Infosimples / idwall | Tomada no-op | chaves no CNPJ do dono + `SUPABASE_SERVICE_ROLE_KEY` |
| Asaas | Esqueleto (webhook 501) | **construir** carteira/split/repasse + chave |
| SMS/WhatsApp + Push | Ausente | definir provedor + construir |

## 9. Deploy & ambientes
Repo `github.com/AppDelyvery/appdelivery` (conta gh dedicada **AppDelyvery**). Push na `main` → **Vercel** deploya (appdelivery-psi.vercel.app). Supabase projeto `cqmxjzrukbagvkznrunt`. Segredos em env var (Vercel + `.env.local`); contas externas no **CNPJ do dono**. Regra dura: `tsc --noEmit` + `next build` + migration aplicada antes do deploy.

## 10. Evolução planejada (Fase 2)
Apps nativos (Expo/Play+App Store) reaproveitando a mesma API; Van intercidade; conectores Bling/Tiny/PDV; camada de IA (previsão de demanda, ETA preditivo, antifraude, score) sobre o motor determinístico atual; multi-praça (a parametrização por cidade já é a base).
