# Módulo de Aceite & Consentimento no Cadastro | AppDelyvery

> Microcopy + especificação técnica para as caixas de aceite no cadastro. Atende à exigência da LGPD de **consentimento/aceite demonstrável** (o controlador precisa provar o aceite).

## 1. Princípios (cravados)
1. **Caixas NÃO pré-marcadas.** Consentimento pré-marcado é nulo (LGPD/ANPD). O usuário marca ativamente.
2. **Separar obrigatório de opcional** — não pode ser "tudo ou nada" (LGPD art. 9º, §3º). Travar o cadastro só pelo aceite essencial (Termos + Privacidade = execução de contrato); o opcional (marketing) não pode travar.
3. **Linguagem clara** + links que abrem os documentos completos.
4. **Registrar a prova:** versão do documento + data/hora + IP/dispositivo. **Read-after-write** obrigatório (ler a row depois de gravar — UI verde não é prova).
5. **Versionamento:** mudança material → re-aceite, com aviso prévio de 30 dias.

## 2. Microcopy — cadastro do LOJISTA
**Obrigatória (trava o cadastro):**
> ☐ Li e concordo com os **[Termos de Uso]** e a **[Política de Privacidade]** do AppDelyvery.

**Opcional (não trava):**
> ☐ Aceito receber novidades, dicas e ofertas do AppDelyvery por WhatsApp e e-mail. *(Pode cancelar quando quiser.)*

## 3. Microcopy — cadastro do ENTREGADOR
**Obrigatória (trava o cadastro):**
> ☐ Li e concordo com os **[Termos do Entregador Parceiro]** e a **[Política de Privacidade]**.

**Obrigatória e DESTACADA — verificação (dado sensível, LGPD art. 11, §1º):**
> ☐ Estou ciente e autorizo a **verificação dos meus antecedentes criminais e da minha CNH** para fins de segurança da operação, na forma da Política de Privacidade.

*Observação jurídica:* a base legal preferencial dessa verificação é o **exercício regular de direitos / segurança** (art. 11, II, "d"), não o consentimento isolado (frágil/revogável num autônomo). A caixa cumpre o dever de **transparência informada e destaque**; a base final é definida pelo advogado. ⚠️

**Opcional (não trava):**
> ☐ Aceito receber comunicados e oportunidades do AppDelyvery por WhatsApp e e-mail.

## 4. Especificação técnica (engenharia)
**Tabela `consentimentos` (ou colunas no perfil) — gravar por aceite:**
| Campo | Exemplo |
|---|---|
| `usuario_id` | uuid |
| `tipo` | `termos_lojista` / `termos_entregador` / `privacidade` / `verificacao_sensivel` / `marketing` |
| `documento_versao` | `2026-06-29` ou `v0.1` |
| `aceito` | true/false |
| `aceito_em` | timestamp (UTC) |
| `ip` | origem |
| `user_agent` | dispositivo/navegador |

**Regras de implementação:**
- Checkbox `checked=false` por padrão; não submeter cadastro essencial sem o aceite obrigatório.
- Marketing e verificação gravados como registros **separados** (consent granular).
- Após o `INSERT`, **ler de volta a row** e confirmar persistência antes de concluir o cadastro (λ.prova-na-fonte).
- Guardar a **versão** do documento aceito → permite detectar quem precisa re-aceitar quando os termos mudarem.
- Endpoint para o titular **revogar** o consentimento opcional (LGPD art. 18, IX) e registrar a revogação (não apagar o histórico, marcar `aceito=false` com novo timestamp).
- Telas-alvo: `/cadastro` (lojista) e `/cadastro/entregador`.

## 5. Re-aceite em mudança de termos
Quando publicar nova versão material: avisar 30 dias antes; no próximo login, exibir modal de re-aceite vinculado à nova `documento_versao`; bloquear ações sensíveis até o aceite (sem apagar dados).
