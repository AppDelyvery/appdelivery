import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Termos de Uso · APPDELYVERY",
  description: "Termos e condições de uso da plataforma APPDELYVERY de entrega de encomendas em Palmas-TO.",
};

const PH = ({ children }: { children: React.ReactNode }) => <span className="ph">{children}</span>;

export default function Termos() {
  return (
    <LegalShell titulo="Termos de Uso" vigencia="Vigência: junho de 2026 · versão rascunho 0.1">
      <p>
        Estes Termos regem o uso da plataforma APPDELYVERY, operada por <PH>[RAZÃO SOCIAL DO DONO]</PH>, CNPJ{" "}
        <PH>[CNPJ]</PH>. Ao se cadastrar ou usar a plataforma, você concorda com estes Termos.
      </p>

      <h2>1. O que é a plataforma</h2>
      <p>
        A APPDELYVERY é um <b>intermediário tecnológico</b> que conecta estabelecimentos (lojistas) a entregadores
        autônomos verificados, para entrega de encomendas em Palmas-TO e região, com rastreamento e comprovação de
        entrega. A plataforma não é transportadora própria.
      </p>

      <h2>2. Cadastro</h2>
      <p>
        O usuário fornece dados verdadeiros e mantém suas credenciais em sigilo. O estabelecimento se cadastra e passa
        a solicitar entregas. O entregador se cadastra, envia documentos e passa por <b>verificação</b> (identidade,
        CNH/CRLV e antecedentes); só opera após aprovação.
      </p>

      <h2>3. Entregador é autônomo</h2>
      <p>
        O entregador atua como <b>profissional autônomo/MEI</b>, sem vínculo empregatício, de subordinação ou
        exclusividade com a plataforma ou com os estabelecimentos. Ele é responsável por seus tributos, veículo,
        habilitação e equipamentos. <PH>[validar enquadramento trabalhista com o jurídico]</PH>
      </p>

      <h2>4. Responsabilidades do estabelecimento</h2>
      <ul>
        <li>Descrever corretamente a encomenda e declarar seu valor.</li>
        <li>Não enviar itens proibidos (seção 6).</li>
        <li>Pagar o frete conforme o preço apresentado antes da solicitação.</li>
        <li>Obter o consentimento do cliente final para envio do link de rastreio.</li>
      </ul>

      <h2>5. Preço, pagamento e repasse</h2>
      <p>
        O frete é calculado por bandeirada + distância, com valor mínimo, exibido antes da confirmação. O pagamento é
        processado por provedor terceiro; do valor, um percentual é repassado ao entregador e o restante é a comissão
        da plataforma. Tributos e taxas do meio de pagamento podem incidir.
      </p>

      <h2>6. Itens proibidos</h2>
      <p>
        É vedado transportar, entre outros: itens ilícitos, drogas, armas, explosivos, produtos perigosos, dinheiro em
        espécie acima de limite, seres vivos e qualquer item que viole a lei. O estabelecimento responde por violações.
      </p>

      <h2>7. Comprovação e responsabilidade por extravio</h2>
      <p>
        A entrega é comprovada por foto e assinatura do destinatário, que compõem a trilha de auditoria. A
        responsabilidade por extravio/avaria observa o valor declarado e os limites previstos na legislação aplicável
        (incl. Código de Defesa do Consumidor). <PH>[definir limites de responsabilidade, seguro e franquia com o
        jurídico]</PH>
      </p>

      <h2>8. Cancelamento</h2>
      <p>
        O pedido pode ser cancelado conforme as regras da plataforma, em geral até a coleta; após a coleta, podem
        incidir custos. <PH>[definir política de cancelamento e reembolso]</PH>
      </p>

      <h2>9. Privacidade</h2>
      <p>
        O tratamento de dados pessoais segue a nossa{" "}
        <a href="/privacidade">Política de Privacidade</a>, parte integrante destes Termos.
      </p>

      <h2>10. Propriedade intelectual</h2>
      <p>A marca, o software e o conteúdo da plataforma pertencem à operadora; é vedado uso não autorizado.</p>

      <h2>11. Alterações e foro</h2>
      <p>
        Podemos alterar estes Termos, com aviso pelos canais da plataforma. Fica eleito o foro da comarca de{" "}
        <b>Palmas-TO</b> para dirimir questões, salvo regra legal em contrário.
      </p>
    </LegalShell>
  );
}
