# Aviso de Privacidade ao Destinatário (Cliente Final) | AppDelyvery

> Texto curto para exibir na **página pública de rastreio** (`/rastreio/[token]`). O destinatário é titular de dados mesmo sem conta (LGPD).

## Texto sugerido (cliente-facing, linguagem simples)

**Sua privacidade na entrega**

Você está acompanhando uma encomenda enviada por um lojista parceiro do **AppDelyvery**.

Para concluir esta entrega, tratamos seus dados (nome, endereço, telefone e a localização do pacote a caminho). Esses dados foram informados pelo **lojista remetente**, que declarou ter autorização para isso, e são usados **apenas para realizar e comprovar a entrega**.

- O entregador vê o necessário para entregar (nome, endereço, telefone).
- A localização é mostrada **apenas durante a entrega**.
- Não vendemos seus dados.

Você pode pedir acesso, correção ou exclusão dos seus dados, na forma da **[Política de Privacidade]**, pelo canal: **[e-mail do Encarregado/DPO]**. Você também pode reclamar à ANPD.

---

## Notas de implementação
- Base legal: execução de contrato (do qual o destinatário é beneficiário) + legítimo interesse (LGPD art. 7º, V e IX).
- **Minimização:** a página de rastreio mostra só o necessário; **nunca** expor dado sensível ou identificador em URL/query string (usar token opaco).
- Link para a Política de Privacidade completa.
- Exibir de forma discreta mas acessível (rodapé do rastreio ou ícone "privacidade").
