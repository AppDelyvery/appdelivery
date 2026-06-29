# VITRINE APPDELYVERY — Plano Mestre
> Pesquisa + posicionamento + funil + esqueleto + o que o front precisa.
> Base pra lapidar a vitrine ANTES de tocar no código. Fonte de verdade desta frente.

---

## 0. Onde a vitrine vive (fato técnico — não redescobrir)
- **Arquivo real:** `public/site/index.html` (HTML estático, 1 arquivo, ~325 linhas).
- **Como é servido:** `next.config.ts` faz `rewrite` de `/` → `/site/index.html`. As rotas do app (`/login`, `/cadastro`, `/negocio`, `/entregador`, `/admin`, `/rastreio`) seguem normais (React/Next).
- **Fontes:** Manrope (corpo) + Sora (títulos). **Atenção:** o design system do app é Inter — a vitrine divergiu de propósito (decidir se mantém).
- **Assets:** `public/site/img/` → `motoboy.jpg`, `motoboy2.jpg`, `cliente.jpg`, `app-login.png`, `app-negocio.png`, `map-hero.png`, `map-cobertura.png`.
- **Cores no HTML:** índigo `#4f46e5`, navy `#0e1430`, verde `#0d9b6c`. (No app o verde é `#059669` — alinhar.)
- **Morto:** `components/site/Landing.tsx` (React) está ofuscado pelo rewrite. **Não usar.** Reverter o "Round 1" navy que foi commitado nele por engano.

---

## 1. Base da pesquisa (4 agentes) — o que ficou de acionável

### A) Anatomia de landings de logística B2B (Lalamove, Loggi, Uber Direct, Onfleet, Roadie)
- Ordem que converte: **Hero → prova social imediata → pilares de valor → como funciona → prova profunda → preço transparente → segmentos → selos → CTA final → footer.**
- **Brecha de ouro:** o mercado todo vende velocidade/escala. **Ninguém grande vende confiança no entregador a sério.** É o nosso eixo.
- Hero = **benefício + janela de tempo + visual (mockup/foto)**, 2 CTAs.
- "Como funciona" sempre começa em *criar/integrar* e termina em *rastrear/comprovar*.
- **Preço transparente** é cunha (sem comissão escondida, "você só paga por entrega").
- **Dois trilhos de cadastro separados** (lojista primário; entregador secundário).

### B) Funil de dois públicos (Uber, iFood, 99, Wolt, DoorDash)
- Padrão vencedor pro nosso caso: **home de UM público (lojista) + porta forte pro outro (entregador)**. NÃO usar dois cards iguais (dilui) nem toggle (parece pequeno).
- **Lojista é o principal:** gera receita, e o diferencial "verificado" vende pra ele.
- **Entregador converte por ganho** (80% + Pix) → funciona numa LP/seção própria.
- **Assimetria de fricção é normal:** cadastro do lojista curto; do entregador mais longo (docs + verificação). Mostrar requisitos antes do form pré-qualifica.
- Nav nomeia o público ("Para empresas" / "Para entregadores"); CTA primário = lojista; footer como mapa de públicos.

### C) Confiança como conversão (Uber, Rover, TaskRabbit, Airbnb, Stripe + CRO)
- **Selo de verificação vive onde a dúvida acontece** — não só na home, mas no card do entregador **no rastreio** (já existe no nosso `RastreioPublico` ✓).
- Ângulo **menos copiável: re-verificação contínua** ("segurança não se checa uma vez só").
- Seção **"Como verificamos"** em 3 camadas nomeadas (Identidade · CNH · Antecedentes) — especificidade gera confiança.
- **Signup de alta conversão:** poucos campos no passo 1, multi-step, prova social colada ao CTA (~100px), CTA em 1ª pessoa, **números reais (nunca "milhares")**.
- ⚠️ Selo de confiança às vezes **derruba** conversão → vale A/B no futuro.
- **REGRA DURA:** sem comparar concorrente. Vender só o nosso, demonstrável.

### D) Tendências visuais 2025-26 (SaaSFrame, Land-book, Awwwards, etc.)
- **Ritmo navy ↔ branco** entre seções (profundidade sem dark total).
- Hero split; **foto real / mockup de produto > 3D abstrato** (3D pesa e abandona no 4G).
- **Bento grid** pra features; **stats bar** com números; motion só `transform/opacity` (scroll-reveal, hover-lift).
- Cor com significado fixo: **índigo = ação/marca · verde = só verificado/entregue · navy = âncora.**
- **Evitar:** glass no hero, 3D, gradiente neon full-bleed, emoji, carrossel automático.

---

## 2. Posicionamento (a régua que julga tudo)
- **O que resolve:** lojista de Palmas precisa entregar hoje, com segurança. Eixo = **entregador verificado por antecedentes** (criminal + CNH + identidade). Em volta: preço transparente, carteira pré-paga, proteção de carga, rastreio, API.
- **Como comunica:** direto, confiança/segurança como espinha dorsal, **local (Palmas-TO)**, profissional mas de gente.
- **Guardrail (cravado):** **nunca afirmar o que o concorrente faz/não faz.** Vender só o nosso e demonstrável.

---

## 3. O FUNIL (a lógica de quem vai pra onde)

```
                          ┌─────────────────────────── VITRINE (/) ───────────────────────────┐
                          │  Eixo: entregador verificado · público principal = NEGÓCIO/lojista │
                          └────────────────────────────────────────────────────────────────────┘
        ┌──────────────────────────────────────┬────────────────────────────────────────┐
        ▼ NEGÓCIO (principal)                   ▼ ENTREGADOR (secundário)                 ▼ CLIENTE FINAL (não cadastra)
   CTA "Cadastrar minha loja"             Nav/seção "Para entregadores"              recebe link do lojista
        │                                       │                                          │
   /cadastro  ──────────────┐             /cadastro/entregador ─────┐                 /rastreio/[token]
        │                   │                   │                   │                       │
   onboarding:              │             cadastro + upload docs    │                 acompanha ao vivo +
   define ENDEREÇO  ────────┘             → VERIFICAÇÃO              │                 vê selo "verificado" +
   (vira ponto de coleta padrão)          (antecedentes/CNH)         │                 avalia no fim
        │                                  → aprovado                │
   painel /negocio                         app /entregador ──────────┘
   (cria pedido → despacho →               (oferta no mapa → coleta →
    rastreio → comprovante →                rota → entrega c/ foto+código →
    carteira)                               ganhos 80% → saque Pix)
```

**Regras do funil:**
1. **CTA primário em todo lugar = lojista** ("Cadastrar minha loja"). Entregador entra por nav/seção/footer, nunca disputa o CTA principal.
2. **Cliente final não tem conta** — só o link de rastreio. A vitrine NÃO fala com ele.
3. **Onboarding do negócio** já fixa o endereço como coleta padrão (semi-automático).
4. **Verificação** é o portão do entregador (e o argumento de venda do lojista).

---

## 4. ESQUELETO DA VITRINE (seção a seção — alvo)
> Mapeia o que JÁ existe no `index.html` → o que muda pela pesquisa. Cada seção: objetivo · conteúdo · CTA.

| # | Seção | Objetivo | Estado atual | O que muda |
|---|-------|----------|--------------|------------|
| 1 | **Nav** (sticky) | orientar + CTA lojista | existe | **CONSERTAR mobile** (botão monta na logo); virar hambúrguer ou CTA único enxuto |
| 2 | **Hero** (lojista) | promessa + confiança em 5s | existe (foto + 2 floats) | manter foto; revisar H1/sub; trust-strip; CTA "Cadastrar minha loja" |
| 3 | **Stats strip** | prova imediata | existe (100%/3/~30s/API) | **números reais** (validar com Eduardo); 100% verificados sempre vale |
| 4 | **Para empresas** | benefícios + painel | existe (3 feats + screenshot) | ok; revisar copy |
| 5 | **Como funciona** | tirar ansiedade do fluxo | existe (3 cards) | ok; talvez 4º passo (comprovante) |
| 6 | **Como verificamos** ★ | o diferencial detalhado | existe band "O diferencial" | **ELEVAR**: 3 camadas nomeadas (Identidade·CNH·Antecedentes) + **re-verificação contínua** |
| 7 | **Por que a gente** | local + suporte | existe | **REESCREVER**: tirar jabs em concorrente ("os grandes te tratam como número", "apps nacionais não chegam") |
| 8 | **Tecnologia** | credibilidade técnica + API | existe (stack + flow) | ok |
| 9 | **Cobertura** | alcance regional | existe (mapa + regiões) | revisar "onde os apps nacionais não chegam bem" |
| 10 | **Para entregadores** | captar oferta | existe (faixa navy) | ok; CTA → /cadastro/entregador |
| 11 | **Planos** | preço transparente | existe (3 planos) | **validar preços reais** com Tulio/Eduardo |
| 12 | **FAQ** | objeções | existe (6 Q) | revisar Q "por que mudar" (sem jab) |
| 13 | **CTA final** | fechar | existe | ok |
| 14 | **Footer** | mapa + legal | existe | ok |

**Veredito:** o esqueleto já está ~90% certo. O trabalho é **lapidar**, não refazer. Prioridade: #1 (mobile), #7/#9/#12 (tirar concorrente), #6 (elevar verificação), #3/#11 (números/preços reais).

---

## 5. O que o FRONT vai precisar (antes de codar)
- **Fotos reais:** já temos motoboy/cliente/painel/mapa. Avaliar qualidade; talvez foto melhor do hero (regra: foto de pessoa = real, nunca IA).
- **Números reais** pra stats (#3) e **preços reais** pra planos (#11) — só Eduardo/Tulio têm.
- **Decisão de fonte:** manter Manrope/Sora na vitrine ou alinhar ao Inter do app.
- **Selo de verificação** como elemento visual reusável (escudo verde) — já existe no `RastreioPublico`; padronizar.
- **Componente de nav mobile** (hambúrguer) — o único pedaço "interativo" novo.

---

## 6. Decisões pendentes (pra Eduardo)
1. **"Não ta aprovado" é principalmente o quê?** (mobile / visual geral / copy / seção específica)
2. **Números reais** das stats — quais podemos cravar hoje?
3. **Preços dos planos** — reais ou "sob consulta" por enquanto?
4. **Fonte:** Manrope/Sora (atual da vitrine) ou Inter (do app)?
5. **Foto do hero** — a atual serve ou troco?

---

## 7. Ordem de execução (quando aprovar o plano)
**P0** Nav mobile + remover toda frase sobre concorrente (#1, #7, #9, #12).
**P1** Elevar "Como verificamos" (3 camadas + re-verificação) (#6).
**P2** Números/preços reais (#3, #11) + alinhar cor/fonte.
**P3** Polimento de motion (scroll-reveal) + microcopy + A/B do selo.

> Uma frente por rodada, você valida cada uma — como combinamos.
