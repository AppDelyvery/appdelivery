# Sistema Jurídico AppDelyvery — Índice e Governança

> **Natureza deste material:** rascunho técnico-jurídico, redação própria (não copiada de terceiros), elaborado a partir de benchmark das políticas de iFood, Rappi, 99, Uber/Uber Envios, Lalamove, Loggi e Bee Delivery, e dos requisitos da **LGPD (Lei 13.709/2018)**, **Marco Civil da Internet (Lei 12.965/2014)** e **Código de Defesa do Consumidor (Lei 8.078/1990)**.
>
> ⚠️ **NÃO PUBLICAR SEM REVISÃO DE ADVOGADO.** Documento jurídico vinculante exige validação profissional (LGPD + responsabilidade civil). Este pacote é a melhor base possível para levar ao jurídico — não um parecer.

Versão do pacote: **rascunho v0.1** · Data de elaboração: 2026-06-29

---

## 1. Posicionamento jurídico do AppDelyvery (a tese que rege tudo)

O AppDelyvery é uma **plataforma de intermediação tecnológica** que conecta:
- **Negócio/Lojista (Remetente)** — quem contrata a entrega;
- **Entregador Parceiro** — profissional autônomo, **verificado por antecedentes criminais + CNH**, que executa o transporte;
- **Destinatário (Cliente Final)** — recebe a encomenda; **não tem conta**, acompanha por link de rastreio;
- **Operadora/Admin** — o AppDelyvery.

A plataforma **não é transportadora** e **não emprega** os entregadores. O transporte é prestado pelo entregador autônomo. (Padrão confirmado em Bee, 99, Uber, Lalamove.)

**Exceção crítica ao "somos só intermediário":** como vendemos **"proteção de carga"** e **"entregador verificado"** como diferenciais comerciais, **não podemos** copiar a isenção total de responsabilidade dos concorrentes. Sob o CDC (art. 30 e 51), prometer e depois se eximir é cláusula abusiva / propaganda enganosa. → A responsabilidade é **limitada e definida**, não nula. Ver `04-PROTECAO-DE-CARGA`.

---

## 2. Arquitetura documental (espelha a 99, o modelo mais aderente)

| # | Documento | Público | Arquivo |
|---|-----------|---------|---------|
| 01 | Política de Privacidade (LGPD) | todos (segmentada por ator) | `01-POLITICA-DE-PRIVACIDADE.md` |
| 02 | Termos de Uso — Lojista/Remetente | negócio B2B | `02-TERMOS-LOJISTA.md` |
| 03 | Termos de Uso — Entregador Parceiro | entregador autônomo | `03-TERMOS-ENTREGADOR.md` |
| 04 | Política de Proteção de Carga + Itens Proibidos | lojista + entregador | `04-PROTECAO-DE-CARGA-E-ITENS-PROIBIDOS.md` |
| 05 | Aceite & Consentimento no cadastro (microcopy + spec) | produto/engenharia | `05-ACEITE-E-CONSENTIMENTO.md` |
| 06 | Aviso de Privacidade ao Destinatário | cliente final (rastreio) | `06-AVISO-AO-DESTINATARIO.md` |

Política de Cookies está incorporada como seção da Política de Privacidade (§ Cookies).

---

## 3. ⚠️ Decisões que SÓ o dono/advogado fecham (pendências cravadas)

1. **Quem é o Controlador?** Provavelmente **Tulio / a empresa dona do AppDelyvery** (não a Impulso, que é desenvolvedora/operadora). Definir razão social, CNPJ, endereço. Formalizar **Contrato de Operador** entre controlador e Impulso (LGPD art. 39).
2. **Base legal do dado sensível (antecedentes criminais + imagem de CNH/biometria).** Recomendação técnica: **exercício regular de direitos** (art. 11, II, "d") e/ou **obrigação legal** (art. 11, II, "a") — **não** depender de consentimento, que é frágil/revogável num autônomo. Advogado decide e redige.
3. **RIPD / DPIA** (Relatório de Impacto — art. 5º, XVII; art. 38): obrigatório de fato aqui (dado sensível em escala + geolocalização contínua). Encomendar.
4. **Encarregado/DPO** (art. 41): nomear pessoa/setor e publicar canal de contato.
5. **Prazos de retenção numéricos** por categoria (entregador, lojista, destinatário, logs MCI = 6 meses, fiscal, laudo de antecedentes).
6. **Teto da proteção de carga** em R$ (a Bee usa R$ 300; Loggi R$ 1.000–3.000; Uber até R$ 5.000). Definir faixas conforme o perfil de carga B2B de Palmas.
7. **Direito de arrependimento (CDC art. 49)** aplicado a serviço de entrega já iniciado — modelar.
8. **Transferência internacional** (arts. 33-36) se algum subprocessador (nuvem/mapas/antifraude) hospedar fora do Brasil.
9. **Validade e reembolso do saldo da carteira pré-paga** (a Bee usa 90 dias sem reembolso — agressivo; calibrar com CDC).

---

## 4. Princípios de redação aplicados (e o que evitamos)

**Aplicado:**
- Base legal LGPD **nomeada por finalidade** (modelo 99, superior ao iFood/Rappi vagos).
- **Foro do domicílio do consumidor** (CDC art. 101, II) — NÃO eleger São Paulo/outra capital como os concorrentes.
- **Aviso prévio de 30 dias** para alterações materiais (modelo iFood), com re-aceite.
- **Não-vínculo empregatício** robusto (modelo Bee cl. 19), autonomia de jornada e de recusa.
- **POD = foto + assinatura + código (PIN)** formalizado como prova de quitação (mais forte que o SMS da 99 / código da Uber).
- **Devido processo na desativação** (status "Pendente", prazo de defesa — modelo Bee 8.13).
- **Minimização do dado sensível**: lojista vê só status apto/inapto, nunca o laudo; nada de dado sensível em URL.

**Evitado (cláusulas abusivas — CDC art. 51, nulas de pleno direito):**
- Isenção total de responsabilidade do fornecedor.
- Cessão de imagem universal e gratuita do entregador (Bee cl. 11 — desproporcional).
- Comissão via boleto externo + negativação em 1 dia (Bee — desproporcional; usamos desconto na liquidação + carteira).
- Modificação unilateral "a qualquer tempo só publicando" (Rappi/99 — frágil).
- Arbitragem compulsória; inversão do ônus da prova contra o consumidor.

---

## 5. Riscos de publicar sem advogado

- **ANPD (art. 52):** multa até 2% do faturamento, limitada a R$ 50 mi/infração; agravada por dado sensível.
- **Cláusulas nulas (CDC art. 51):** termos "blindados" caem em juízo; PROCON/MP autuam.
- **Vazamento de antecedentes/CNH:** dano moral coletivo + responsabilidade civil (LGPD 42-45) + comunicação obrigatória à ANPD (art. 48).
- **Base legal errada para sensível:** programa de verificação fica juridicamente instável.

---

## 6. Próximos passos

1. Dono define os itens da Seção 3.
2. Advogado revisa e ajusta (foco: sensível, responsabilidade, foro, retenção, RIPD).
3. Engenharia implementa o módulo de **Aceite & Consentimento** (`05`) nas telas `/cadastro` e `/cadastro/entregador`, com gravação + prova (read-after-write).
4. Publicar nas rotas `/termos` e `/privacidade` (hoje rascunho).
