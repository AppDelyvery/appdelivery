# Política de Privacidade — AppDelyvery

> ⚠️ Rascunho para revisão jurídica. Campos entre `[ ]` precisam ser preenchidos pelo dono/advogado. Marcadores ⚠️ indicam decisão jurídica pendente.

**Controlador:** [RAZÃO SOCIAL], CNPJ [CNPJ], com sede em [ENDEREÇO], Palmas-TO ("AppDelyvery", "nós").
**Encarregado pelo Tratamento de Dados (DPO):** [NOME/SETOR] — [e-mail/canal]. ⚠️ *art. 41 LGPD — obrigatório nomear e publicar.*
**Operadora de tecnologia:** Impulso Digital (desenvolve e opera a plataforma sob contrato de operador — LGPD art. 39).
**Última atualização:** [data].

Esta Política explica, de forma transparente (LGPD art. 6º e 9º), como tratamos dados pessoais na plataforma AppDelyvery — app e site de **entrega de encomendas sob demanda** em Palmas-TO e região.

---

## 1. A quem esta Política se aplica

Tratamos dados de quatro grupos. Cada seção abaixo indica o que coletamos de cada um:
- **Negócio/Lojista (Remetente)** — empresa ou pessoa que contrata a entrega.
- **Entregador Parceiro** — profissional autônomo que executa a entrega.
- **Destinatário (Cliente Final)** — quem recebe a encomenda; **não possui conta**.
- **Visitante** — quem acessa o site/app sem cadastro.

---

## 2. Quais dados coletamos e por quê (com base legal)

Tratamos cada dado para uma **finalidade determinada** e sob uma **base legal específica** (LGPD art. 7º; art. 11 para dado sensível). Quadro por ator:

### 2.1 Negócio/Lojista (Remetente)
| Dado | Finalidade | Base legal (LGPD) |
|---|---|---|
| Nome/razão social, CPF/CNPJ, e-mail, telefone, endereço de coleta | Cadastro, identificação, faturamento | Execução de contrato (art. 7º, V) |
| Dados de pagamento (Pix/cartão via Asaas) — tokenizados | Cobrança, carteira pré-paga, repasse | Execução de contrato (art. 7º, V) |
| Histórico de pedidos, valores, avaliações | Operação do serviço, suporte, relatórios | Execução de contrato + legítimo interesse (art. 7º, IX) |
| Dados do destinatário fornecidos pelo lojista | Realizar a entrega | Execução de contrato; o lojista declara ter autorização (ver § 2.3) |

### 2.2 Entregador Parceiro
| Dado | Finalidade | Base legal (LGPD) |
|---|---|---|
| Nome, CPF, e-mail, telefone, endereço, foto de perfil | Cadastro e identificação | Execução de contrato (art. 7º, V) |
| **CNH** (categoria, validade; com EAR quando exigido) | Habilitação legal para conduzir/entregar | Cumprimento de obrigação legal/regulatória (art. 7º, II) |
| Dados do veículo (placa, CRLV) | Habilitação operacional | Execução de contrato |
| **Antecedentes criminais (resultado da verificação)** | Triagem de segurança da operação ("entregador verificado") | ⚠️ **Dado de altíssimo risco — tratar como sensível (art. 11).** Base recomendada: **exercício regular de direitos (art. 11, II, "d")** e/ou obrigação legal — *não* consentimento. Decisão do advogado. |
| Selfie/biometria de verificação (se houver) | Antifraude, confirmar titularidade da conta | Dado sensível (art. 11) — base e consentimento destacado a definir ⚠️ |
| Geolocalização em tempo real (GPS, 1º e 2º plano) | Roteirização, oferta de corrida, rastreio ao vivo e prova de entrega | Execução de contrato + legítimo interesse (segurança) |
| Dados bancários/chave Pix | Repasse dos ganhos | Execução de contrato |

**Minimização do dado sensível (art. 6º, III):** armazenamos o **resultado** da verificação de antecedentes (apto/inapto + data), com acesso restrito ao time de segurança. **O lojista e o destinatário NUNCA têm acesso ao teor dos antecedentes nem à imagem da CNH** — veem apenas o selo "verificado". Dado sensível **jamais** trafega em URL ou identificador público.

### 2.3 Destinatário (Cliente Final) — sem conta
| Dado | Finalidade | Base legal (LGPD) |
|---|---|---|
| Nome, endereço de entrega, telefone | Concluir a entrega, gerar link de rastreio, contato do entregador | Execução de contrato (do qual é beneficiário) + legítimo interesse (art. 7º, IX) |
| Localização aproximada (acompanhamento do pacote) | Mostrar o pacote a caminho | Legítimo interesse |
| Assinatura/foto/código no recebimento | Comprovação de entrega | Execução de contrato + legítimo interesse |

Os dados do destinatário são **fornecidos pelo lojista remetente**, que declara nos Termos ter base/autorização para compartilhá-los. O destinatário é titular de direitos (§ 6), mesmo sem conta.

### 2.4 Visitante / dados gerados no uso
Dados de navegação, dispositivo, IP, cookies e logs (ver § 7) — base: legítimo interesse e cumprimento do Marco Civil (guarda de registros de acesso por 6 meses, MCI art. 15).

---

## 3. Decisões automatizadas

O AppDelyvery usa processamento automatizado para **oferta dirigida de corridas** (ranking por distância × avaliação × confiabilidade), **precificação** e **detecção de fraude**. O titular tem direito a solicitar revisão dessas decisões (LGPD art. 20).

---

## 4. Com quem compartilhamos

Compartilhamos o mínimo necessário, com:
- **Entregador** — nome, endereço e telefone do destinatário, e dados da coleta (para executar a entrega);
- **Lojista** — status e comprovante da entrega; nome do entregador para validar identidade no recebimento (não o teor de antecedentes);
- **Processador de pagamento** — Asaas / arranjo Pix (cobrança e repasse);
- **Provedor de mapas/geolocalização** — roteirização e rastreio;
- **Serviço de verificação de antecedentes/CNH** — [fornecedor], apenas para a triagem;
- **Autoridades** — mediante ordem legal/judicial.

Não vendemos dados pessoais. Compartilhamento de dado sensível observa base do art. 11.

---

## 5. Armazenamento, retenção e segurança

- **Onde:** servidores [provedor/nuvem]. ⚠️ Se houver hospedagem fora do Brasil, declarar transferência internacional e garantia adequada (LGPD arts. 33-36).
- **Por quanto tempo:** pelo tempo da relação + prazos legais. ⚠️ Definir prazos numéricos: dados fiscais/financeiros [5 anos]; logs de acesso [6 meses — MCI]; resultado de verificação de antecedentes [enquanto ativo + X após desligamento]; carteira/pagamentos [conforme obrigação].
- **Segurança (art. 46-49):** controle de acesso por papel (need-to-know), criptografia em trânsito e repouso, tokenização de dados de cartão (PAN não armazenado), trilha de auditoria de acesso a dado sensível. Em caso de incidente relevante, comunicamos a ANPD e os titulares (art. 48).

---

## 6. Seus direitos (LGPD art. 18)

Você pode, a qualquer tempo: (I) confirmar a existência de tratamento; (II) acessar seus dados; (III) corrigir dados incompletos/desatualizados; (IV) anonimizar, bloquear ou eliminar dados desnecessários ou tratados em desconformidade; (V) portar seus dados; (VI) eliminar dados tratados com consentimento; (VII) saber com quem compartilhamos; (VIII) ser informado sobre a possibilidade de não consentir e suas consequências; (IX) revogar consentimento; e solicitar **revisão de decisões automatizadas** (art. 20).

**Como exercer:** [canal — e-mail do DPO / área in-app "Privacidade e Dados"]. Responderemos nos prazos da LGPD. Você também pode reclamar diretamente à **ANPD**.

---

## 7. Cookies e tecnologias de rastreamento

Usamos cookies e SDKs (essenciais, de desempenho/analytics e de notificações). Os essenciais mantêm a sessão e a segurança; os demais podem ser geridos nas preferências do navegador/dispositivo. [Detalhar tipos e finalidades.]

---

## 8. Crianças e adolescentes

A plataforma não se destina a menores de 18 anos. Não coletamos dados de menores conscientemente; se identificado, eliminamos. Eventual tratamento observará o melhor interesse e o consentimento de um dos pais (art. 14).

---

## 9. Alterações desta Política

Podemos atualizar esta Política. Mudanças **materiais** serão comunicadas com **antecedência de 30 dias**, e poderemos solicitar novo aceite. A data de "última atualização" indica a versão vigente.

---

## 10. Contato

Encarregado (DPO): [nome/setor] — [e-mail]. Controlador: [razão social/CNPJ/endereço].
