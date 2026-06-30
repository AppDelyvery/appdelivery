// Conteúdo dos documentos legais — fonte ÚNICA, usada tanto nas rotas
// /termos e /privacidade quanto no modal de leitura dentro do cadastro.
// (Mantém o rascunho atual; o texto definitivo dos drafts em legal/ entra
// depois da revisão do advogado.)

const PH = ({ children }: { children: React.ReactNode }) => <span className="ph">{children}</span>;

export const VIGENCIA = "Vigência: junho de 2026 · versão 1.0";

export function TermosContent() {
  return (
    <>
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
        exclusividade com a plataforma ou com os estabelecimentos. Ele organiza livremente sua jornada, conecta-se e
        desconecta-se quando quiser e aceita ou recusa cada oferta a seu critério. É responsável por seus tributos,
        veículo, habilitação e equipamentos.
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

      <h2>7. Comprovação, proteção de carga e responsabilidade por extravio</h2>
      <p>
        A entrega é comprovada por <b>foto, assinatura e código de confirmação (PIN)</b> do destinatário, que juntos
        constituem a prova de quitação da entrega.
      </p>
      <p>
        A plataforma oferece <b>Proteção de Carga</b>: ressarce o estabelecimento, em caso de extravio ou avaria
        comprovados, <b>limitada ao valor declarado</b> da encomenda e ao <b>teto vigente de R$ 300,00 por entrega</b>.
        A proteção <b>não cobre</b> itens proibidos (seção 6), encomendas sem nota fiscal ou declaração de conteúdo,
        embalagem inadequada do remetente, dinheiro, joias e itens frágeis mal acondicionados, e só vale enquanto o GPS
        do entregador esteve ativo. O sinistro deve ser comunicado em até <b>7 dias corridos</b>, com fotos do produto
        e da embalagem. Trata-se de garantia contratual da plataforma — não é seguro regulado pela SUSEP. A
        responsabilidade observa, ainda, os limites do Código de Defesa do Consumidor.
      </p>

      <h2>8. Cancelamento e reembolso</h2>
      <p>
        O cancelamento <b>antes do aceite</b> do entregador é gratuito. <b>Após o aceite ou iniciada a coleta</b>, pode
        incidir uma taxa de cancelamento para cobrir o deslocamento do entregador. Quando a entrega não é realizada por
        falha da plataforma, os valores pagos são <b>reembolsados pelo mesmo meio de pagamento</b>. Saldo de carteira
        pré-paga não utilizado pode ser usado em novas entregas.
      </p>

      <h2>9. Privacidade</h2>
      <p>
        O tratamento de dados pessoais segue a nossa <b>Política de Privacidade</b>, parte integrante destes Termos.
      </p>

      <h2>10. Propriedade intelectual</h2>
      <p>A marca, o software e o conteúdo da plataforma pertencem à operadora; é vedado uso não autorizado.</p>

      <h2>11. Alterações e foro</h2>
      <p>
        Podemos alterar estes Termos; mudanças relevantes são comunicadas com <b>30 dias de antecedência</b> pelos
        canais da plataforma, podendo exigir novo aceite. Nas relações de consumo, fica eleito o <b>foro do domicílio
        do consumidor</b> (CDC, art. 101, II); nos demais casos, o foro da comarca de <b>Palmas-TO</b>.
      </p>
    </>
  );
}

export function PrivacidadeContent() {
  return (
    <>
      <p>
        Esta Política explica como a <PH>[RAZÃO SOCIAL DO DONO]</PH>, CNPJ <PH>[CNPJ]</PH> (&quot;APPDELYVERY&quot;,
        &quot;nós&quot;), na qualidade de <b>controladora</b>, trata dados pessoais na plataforma de entrega de
        encomendas em Palmas-TO, em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).
      </p>

      <h2>1. Quem somos e contato do Encarregado (DPO)</h2>
      <p>
        Controladora: <PH>[RAZÃO SOCIAL / CNPJ / ENDEREÇO]</PH>. Dúvidas, solicitações sobre seus dados e o contato com
        o Encarregado de Dados (DPO) podem ser feitos pelo <b>canal de suporte do aplicativo</b>. O Encarregado é
        formalmente designado e identificado nesta Política.
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
          <b>Base legal:</b> o exercício regular de direitos e a tutela da segurança de pessoas e bens (LGPD, art. 11,
          II), somado ao consentimento específico e destacado do entregador no momento do cadastro.
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
    </>
  );
}

export function TermosEntregadorContent() {
  return (
    <>
      <p>
        Estes Termos regulam o acesso e uso, pelo <b>Entregador Parceiro</b>, da plataforma APPDELYVERY, operada por{" "}
        <PH>[RAZÃO SOCIAL DO DONO]</PH>, CNPJ <PH>[CNPJ]</PH>, para receber e executar ofertas de entrega de encomendas
        em Palmas-TO e região, na qualidade de <b>profissional autônomo</b>. Ao se cadastrar, o Entregador declara ter
        lido e aceito estes Termos e a <b>Política de Privacidade</b>, e autorizado a verificação descrita na seção 4.
      </p>

      <h2>1. Pré-requisitos</h2>
      <ul>
        <li>Ser maior de 18 anos, com documento oficial com foto.</li>
        <li>CNH válida, categoria compatível com o veículo (com observação EAR quando exigida por lei).</li>
        <li>Veículo (moto, carro ou van) em condições legais de circulação, com CRLV em dia.</li>
        <li>Conta bancária ou chave Pix em nome próprio para recebimento.</li>
      </ul>

      <h2>2. Cadastro e conta</h2>
      <p>
        A conta é pessoal e intransferível. O Entregador mantém seus dados atualizados e é responsável pelas credenciais
        e por todos os atos praticados na sua conta.
      </p>

      <h2>3. Verificação e dado sensível</h2>
      <p>
        O acesso depende de aprovação em <b>verificação de identidade, CNH e antecedentes criminais</b> — é o que
        sustenta o selo de entregador verificado. A base legal do tratamento dos antecedentes é o <b>exercício regular
        de direitos e a segurança da operação</b> (LGPD, art. 11, II), com o consentimento específico e destacado do
        Entregador. A plataforma guarda apenas o <b>resultado</b> da verificação (apto/inapto); lojistas e destinatários
        nunca têm acesso ao teor dos antecedentes.
      </p>

      <h2>4. Inexistência de vínculo empregatício</h2>
      <p>
        O Entregador é <b>profissional autônomo independente</b>. Estes Termos não criam vínculo empregatício,
        societário, de representação ou de subordinação. Não há os elementos do vínculo de emprego: o Entregador
        organiza livremente sua jornada, <b>conecta-se e desconecta-se quando quiser e aceita ou recusa cada oferta a
        seu critério</b>, sem exclusividade. Cada parte arca com seus próprios tributos, contribuições (inclusive
        previdenciária) e custos (combustível, manutenção, equipamentos).
      </p>

      <h2>5. Remuneração e repasse</h2>
      <p>
        O Entregador recebe <b>80% do valor do frete</b> de cada entrega concluída; a plataforma retém <b>20% a título
        de intermediação</b>, deduzido diretamente na liquidação (sem cobrança externa ou boleto). Os valores são
        creditados na carteira do Entregador e sacados via <b>Pix</b>. Falhas atribuíveis ao intermediador financeiro
        não são de responsabilidade da plataforma.
      </p>

      <h2>6. Deveres e conduta</h2>
      <ul>
        <li>Tratar lojistas, destinatários e a plataforma com respeito; não discriminar.</li>
        <li>Não dirigir sob efeito de álcool ou substâncias; cumprir o CTB e a Lei 12.009/2009, quando aplicável.</li>
        <li>Não aliciar clientes para fora da plataforma nem usar dados de clientes para outro fim.</li>
        <li>Zelar pela integridade da encomenda e cumprir as regras de itens proibidos e proteção de carga.</li>
      </ul>

      <h2>7. Responsabilidade pela carga</h2>
      <p>
        O Entregador deve entregar a encomenda nas mesmas condições em que a coletou. Avaria ou extravio decorrente de
        sua <b>má conduta, dolo ou culpa</b> é de sua responsabilidade, excetuados os casos de <b>força maior ou caso
        fortuito</b> (ex.: roubo com violência devidamente registrado). O Entregador pode <b>recusar</b> coleta de item
        com embalagem inadequada ou com suspeita de item proibido.
      </p>

      <h2>8. Geolocalização e rastreamento</h2>
      <p>
        O uso exige permissão de <b>localização em tempo real</b> enquanto o Entregador está on-line, para oferta de
        corridas, rastreamento e prova de entrega. O lojista e o destinatário <b>apenas visualizam</b> a posição durante
        a entrega; não recebem os dados brutos de localização.
      </p>

      <h2>9. Suspensão, bloqueio e desativação</h2>
      <p>
        O modelo é <b>escalonado</b>: inativação por dados irregulares ou inatividade; bloqueio temporário por
        descumprimento de conduta; e bloqueio geral por falta grave (apropriação indevida de mercadoria ou valores,
        fraude documental, violência, encerrar a entrega sem coletar). Ao receber uma denúncia, o Entregador entra em
        status <b>&quot;Pendente&quot;</b> e tem <b>2 dias úteis</b> para se defender pelo suporte; a análise ocorre em
        até 2 dias úteis, com <b>direito de revisão</b> da decisão. Faltas graves podem gerar desativação imediata,
        resguardado o direito de manifestação.
      </p>

      <h2>10. Propriedade intelectual e imagem</h2>
      <p>
        O uso da marca e do aplicativo é licenciado apenas para operar o serviço. Eventual uso da imagem do Entregador
        em materiais de divulgação depende de <b>autorização específica e revogável</b>.
      </p>

      <h2>11. Inexistência de garantias</h2>
      <p>
        A plataforma é fornecida &quot;no estado em que se encontra&quot;; não garantimos volume mínimo de ofertas,
        rentabilidade ou funcionamento ininterrupto.
      </p>

      <h2>12. Alterações e foro</h2>
      <p>
        Mudanças relevantes são comunicadas com <b>30 dias de antecedência</b>, podendo exigir novo aceite. Aplica-se a
        legislação brasileira; fica eleito o foro da comarca de <b>Palmas-TO</b>, ressalvado, nas relações de consumo, o
        foro do domicílio do consumidor.
      </p>
    </>
  );
}
