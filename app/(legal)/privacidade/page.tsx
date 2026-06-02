import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Política de Privacidade · APPDELYVERY",
  description: "Como o APPDELYVERY trata dados pessoais, incluindo dados sensíveis (antecedentes), conforme a LGPD.",
};

const PH = ({ children }: { children: React.ReactNode }) => <span className="ph">{children}</span>;

export default function Privacidade() {
  return (
    <LegalShell titulo="Política de Privacidade" vigencia="Vigência: junho de 2026 · versão rascunho 0.1">
      <p>
        Esta Política explica como a <PH>[RAZÃO SOCIAL DO DONO]</PH>, CNPJ <PH>[CNPJ]</PH> (&quot;APPDELYVERY&quot;,
        &quot;nós&quot;), na qualidade de <b>controladora</b>, trata dados pessoais na plataforma de entrega de
        encomendas em Palmas-TO, em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).
      </p>

      <h2>1. Quem somos e contato do Encarregado (DPO)</h2>
      <p>
        Controladora: <PH>[RAZÃO SOCIAL / CNPJ / ENDEREÇO]</PH>. Encarregado de Dados (DPO):{" "}
        <PH>[NOME]</PH>, e-mail <PH>[privacidade@dominio.com.br]</PH>. Dúvidas e pedidos sobre seus dados podem ser
        enviados a esse contato.
      </p>

      <h2>2. Quais dados coletamos, por ator</h2>
      <p>
        <b>Estabelecimento (lojista):</b> nome do responsável, e-mail, telefone, CNPJ/CPF, endereço de coleta e dados
        de pagamento (processados pelo provedor de pagamento).
      </p>
      <p>
        <b>Entregador:</b> nome, CPF, dados da CNH e do veículo (CRLV), selfie para conferência de identidade,
        localização (GPS) durante as corridas, dados bancários para repasse e <b>antecedentes criminais</b>.
      </p>
      <p>
        <b>Cliente final (destinatário):</b> nome, telefone e endereço de entrega — fornecidos pelo estabelecimento
        para viabilizar a entrega e o acompanhamento por link.
      </p>

      <h2>3. Dado sensível: antecedentes criminais</h2>
      <p>
        Os antecedentes do entregador são <b>dado pessoal sensível</b> (LGPD, art. 5º, II) e recebem tratamento
        reforçado:
      </p>
      <ul>
        <li>
          <b>Finalidade única:</b> avaliar a idoneidade do entregador para transportar encomendas de terceiros —
          a segurança que sustenta o serviço.
        </li>
        <li>
          <b>Base legal:</b> consentimento específico e destacado do entregador no cadastro, e proteção da segurança
          de pessoas e bens. <PH>[validar base legal com o jurídico]</PH>
        </li>
        <li>
          <b>Acesso restrito:</b> visível apenas à equipe de operação/administração. <b>Nunca</b> é compartilhado com
          o estabelecimento, com o cliente final, nem exibido em telas, URLs ou comprovantes.
        </li>
        <li>
          <b>Retenção:</b> mantido apenas enquanto o entregador estiver ativo na plataforma e pelo prazo legal
          aplicável; depois, eliminado ou anonimizado.
        </li>
      </ul>

      <h2>4. Para que usamos os dados</h2>
      <ul>
        <li>Criar e autenticar contas; conectar lojista, entregador e cliente final.</li>
        <li>Calcular preço, traçar rota e ETA, e fazer o rastreamento ao vivo da entrega.</li>
        <li>Verificar a idoneidade e a habilitação do entregador (antecedentes, CNH, CRLV).</li>
        <li>Processar pagamento e repasse; emitir comprovantes (foto e assinatura na entrega).</li>
        <li>Enviar avisos de status ao cliente final por SMS/WhatsApp.</li>
        <li>Prevenir fraude e cumprir obrigações legais.</li>
      </ul>

      <h2>5. Compartilhamento com terceiros (operadores)</h2>
      <p>Usamos prestadores que tratam dados em nosso nome, somente para as finalidades acima:</p>
      <ul>
        <li>Hospedagem e banco de dados (infraestrutura em nuvem).</li>
        <li>Mapa, rota e geolocalização.</li>
        <li>Processamento de pagamento e repasse.</li>
        <li>Verificação de CNH e de antecedentes (consultas a bases oficiais/credenciadas).</li>
        <li>Envio de SMS/WhatsApp ao cliente final.</li>
      </ul>
      <p>Não vendemos dados pessoais. Compartilhamos com autoridades apenas quando exigido por lei.</p>

      <h2>6. Seus direitos (LGPD, art. 18)</h2>
      <p>
        Você pode solicitar: confirmação e acesso aos seus dados; correção; anonimização, bloqueio ou eliminação;
        portabilidade; informação sobre compartilhamento; e revogação do consentimento. Basta escrever ao Encarregado
        (seção 1).
      </p>

      <h2>7. Segurança e retenção</h2>
      <p>
        Adotamos medidas técnicas e organizacionais para proteger os dados (controle de acesso por papel, criptografia
        em trânsito, registros de auditoria). Mantemos os dados pelo tempo necessário às finalidades e às obrigações
        legais; a posição de GPS ao vivo é efêmera e não é gravada ponto a ponto.
      </p>

      <h2>8. Cookies</h2>
      <p>Usamos cookies estritamente necessários para autenticação e funcionamento da plataforma.</p>

      <h2>9. Alterações</h2>
      <p>Podemos atualizar esta Política; mudanças relevantes serão comunicadas pelos canais da plataforma.</p>
    </LegalShell>
  );
}
