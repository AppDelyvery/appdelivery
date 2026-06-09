# APPDELYVERY — Polimento do Front, Testes e Vitrine

> Auditoria fina (código) de 08/06/2026, tela por tela. O front **funciona** (motores ok), mas está
> **~70-75% polido**: faltam estados, validações, edge cases e acabamento mobile. Companion do
> `PLANO-DE-ENTREGA.md`. A validação VISUAL fica com a instância "olhos" (Chrome) + testes em aparelho real.

---

## 0. BUGS / GAPS CRÍTICOS (consertar antes de "operar de verdade")

- [ ] **Rastreio mostra entregador FAKE** — `/rastreio/[token]` exibe "Lucas Mendes / Honda CG 160 / ABC-1D23 / 4,9" hardcoded e GPS em simulação (`usePosicaoAoVivo` existe mas não é usado). Tem que puxar do `get_rastreio_publico` real + ligar o GPS ao vivo. **(É o link que foi pro investidor.)**
- [ ] **Dados sensíveis hardcoded no cadastro do entregador** — `defaultValue="Diego Alves de Souza"` + CPF de exemplo no `EntregadorFlow`. Remover.
- [ ] **Cadastro não valida CPF/CNPJ** — aceita "123". Falta máscara + validação (dígito verificador) no negócio e no entregador.
- [ ] **Criar pedido sem saldo não bloqueia** — lojista com carteira zerada cria pedido (entregador entregaria sem garantia de pagamento). Validar saldo antes de criar (pré-flight) — casa com a Fase 2 (Asaas).
- [ ] **Código de entrega sem limite de tentativas** — brute force possível. Throttle (ex. 3 erros → espera).
- [ ] **"Buscando entregador" eterno** — se ninguém aceita, fica travado sem timeout nem opção de cancelar/retentar. Definir timeout + ação.

---

## 1. POLIMENTO TRANSVERSAL (vale pra quase todas as telas)

- [ ] **Estados de carregamento** — trocar "Carregando…" por skeletons; padronizar.
- [ ] **Estado de erro com retry** — hoje várias telas falham em silêncio (lista vazia) se a query quebra. Botão "tentar de novo" + toast.
- [ ] **Tempo real nas listas** — Histórico, Ganhos, Comunicados, fila do Admin só atualizam no reload. Ligar Realtime/poll onde faz sentido (ex. comunicado urgente, nova corrida).
- [ ] **Validações de formulário** — máscara e tipo certo: CPF, CNPJ, telefone, valor declarado (`inputMode="numeric"`, sem aceitar valor absurdo).
- [ ] **Mobile fino** — garantir toque ≥44px em todos os botões (`.btn` hoje não garante), tabelas com overflow visível, testar **landscape** (painel/mapa apertam), `<pre>` da API e canvas de assinatura sem estourar a tela.
- [ ] **Feedback de ação** — assinatura sem confirmação visual ("assinado ✓"); foto enviada sem check; SlideConfirm sem vibração.

---

## 2. POR PERSONA (itens curados, além do transversal)

### Negócio
- [ ] Novo pedido: toggle **"retorno" não tem lógica** ligada (existe no banco/0026, falta na tela); endereço fora de Palmas não é barrado; sem timeout no matching.
- [ ] Carteira: botão "Adicionar saldo (em breve)" — ativar com Asaas; tratar saldo baixo/zerado com aviso.
- [ ] Relatórios: mostra 50 na tela mas CSV exporta tudo (alinhar expectativa); avisar export vazio.
- [ ] Perfil: sem edição de dados ainda; conta suspensa não tem aviso/sessão-kill.

### Entregador
- [ ] Verificação: animação "aprovado" é cosmética (timer fixo) — tem que refletir o resultado REAL do backend (senão mostra "aprovado" mentindo).
- [ ] Oferta: ao expirar/cair internet no aceite, fica em limbo — precisa re-buscar próxima/reconectar.
- [ ] Coleta/Entrega: geofence 100m pode dar falso-positivo (GPS impreciso em prédio) — mensagem clara de quantos metros faltam; foto/assinatura com validação real.
- [ ] Status "recusado": sem caminho pra reapelar/refazer.
- [ ] Home: ao voltar depois de tempo, pode estar "offline" no backend sem avisar.

### Admin
- [ ] PIN de aprovação não é `required` (deixa aprovar sem PIN em alguns pontos) — travar.
- [ ] Comprovantes no drawer de Corridas aparecem vazios quando não há foto — ok, mas confirmar que aparecem quando há (depende da máquina de estados real).
- [ ] Financeiro: texto "movimento real sai quando Asaas existir" — trocar por estado neutro até ligar.
- [ ] Mensagens: sem paginação (carrega todas — trava com volume).
- [ ] Config: sem preview de impacto ao mudar preço; sem histórico de mudança.

### Cliente final (rastreio)
- [ ] (ver crítico) dados reais + GPS ao vivo.
- [ ] Token inválido → tela de erro amigável (hoje quebra/branco).
- [ ] Entrega concluída/antiga → mostrar status final claro.

---

## 3. SITE VITRINE — conversão (capta cliente?)
Hoje é claro e bonito, mas **não foi feito pra converter**. Falta:
- [ ] **Prova social / números** — "X entregas feitas", "Y negócios atendidos", depoimentos. Hero só tem conceito.
- [ ] **Cobertura no hero** — "Palmas e região" só aparece miúdo no rodapé.
- [ ] **FAQ** — "Como é a verificação?", "Quanto custa?", "Atende meu bairro?" (tira objeção + ajuda SEO/AEO).
- [ ] **CTA do entregador mais forte** — hoje é ghost button discreto; o marketplace precisa dos dois lados.
- [ ] **Tirar "em breve"** da jornada do lojista (sinaliza produto incompleto).
- [ ] **SEO on-page** — title/description/OG por página; schema LocalBusiness/FAQ; imagem de hero real otimizada.

---

## 4. PLANO DE TESTES REAIS

### Aparelhos (mobile é 90% do uso)
- [ ] iPhone SE / 375px, Android 360px, iPad/tablet 768-1023px (o "vão" tablet é o menos testado), 1 desktop.
- [ ] **2 aparelhos pro GPS** (papel dos "olhos"/Chrome): entregador anda → lojista e cliente veem mover ao vivo.

### Cenários ponta a ponta (cada um, na fonte/banco)
- [ ] Lojista cria pedido **sem saldo** → deve bloquear.
- [ ] Pedido criado → ninguém online → comportamento do "buscando" (timeout?).
- [ ] Entregador aceita oferta → **perde GPS/internet** no meio → não pode ficar em limbo.
- [ ] Coleta/entrega **longe do ponto** → geofence avisa; com foto+assinatura+código → conclui e credita.
- [ ] **Código errado 3x** → throttle.
- [ ] Rastreio com **token inválido** → erro amigável.
- [ ] Cadastro com **CPF/CNPJ inválido** → barra.
- [ ] Admin aprova entregador **sem PIN** → barra.
- [ ] Suspender negócio/entregador enquanto ele usa → efeito imediato.

---

## Prioridade sugerida
1. **Críticos (seção 0)** — principalmente rastreio real + validações de cadastro/saldo (são correção, rápidos e de risco).
2. **Transversal (seção 1)** — estados + mobile fino (eleva tudo de uma vez).
3. **Vitrine (seção 3)** — em paralelo, porque alimenta a captação.
4. **Por persona (seção 2)** — varredura final tela a tela.
