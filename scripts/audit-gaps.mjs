export const meta = {
  name: 'audit-gaps-palmas',
  description: 'Frota de auditores varre a operação simulada do AppDelyvery em 7 dimensões e crava os gaps (financeiro, estados, despacho, RLS/LGPD, avaliações/disputas, confiabilidade, cobertura)',
  phases: [{ title: 'Auditoria', detail: '7 auditores em paralelo, cada um numa dimensão' }],
};

// Filtro dos dados de simulação (sempre usar nas queries): emails ~ '^sim\.(est|ent)\.'
const DIMENSOES = [
  {
    area: 'Integridade financeira',
    foco: `Provar o dinheiro da operação sim. Rode queries com node scripts/query.mjs e verifique:
1) Em TODO pedido status='entregue', preco_entregador deve ser EXATAMENTE 80% e preco_plataforma 20% de preco_total (tolerância 1 centavo). Procure divergências.
2) entregadores.saldo de cada um deve bater com: soma(preco_entregador dos seus entregues) - soma(saques pagos/processando). Procure saldos negativos ou inconsistentes.
3) carteira_transacoes: soma de 'debito' por loja deve igualar soma(preco_total) dos pedidos cobrados; cancelados devem ter 'credito' de estorno.
4) Nenhum saque com valor > saldo disponível no momento; saque mínimo R$35 respeitado.
5) take_rate da config bate com o split praticado?`,
  },
  {
    area: 'Máquina de estados do pedido',
    foco: `Caçar estados impossíveis nos pedidos sim:
1) status='entregue' SEM entregue_at OU sem coletado_at OU sem entregador_id.
2) status='coletado'/'a_caminho_entrega' sem coletado_at ou sem entregador_id.
3) status='aceito' sem entregador_id ou sem aceito_at.
4) codigo_entrega ausente em pedidos que chegaram a coletado+.
5) Timestamps fora de ordem (aceito_at > coletado_at > entregue_at deve ser crescente).
6) status='buscando' COM entregador_id preenchido (vazamento).`,
  },
  {
    area: 'Despacho e ofertas',
    foco: `Testar o motor de oferta (trg_dispatch_pedido / ofertar_proximo) na operação sim:
1) Pedidos 'buscando' geraram linha em ofertas? Quantos buscando NÃO têm nenhuma oferta (gap de dispatch)?
2) Algum pedido com DUAS ofertas status='aceita' (dupla atribuição = furo)?
3) Ofertas 'ofertada' vencidas (expira_at < now) que não viraram 'expirada' (cron não processou)?
4) Ofertas órfãs (pedido já entregue/cancelado mas oferta ainda 'ofertada').`,
  },
  {
    area: 'Chat, RLS e LGPD',
    foco: `Segurança/privacidade na operação sim:
1) mensagens: algum autor_papel inconsistente? Mensagens em pedido que o autor não participa?
2) Dado sensível do cliente (cliente_final_nome/telefone) aparece em listar_corridas_disponiveis? (logar como um entregador sim via REST e checar o retorno — NÃO deve vazar).
3) Antecedentes / verificacoes expostos a quem não é admin?
4) Cross-tenant: um estabelecimento consegue ler pedido de OUTRO (RLS)? (teste conceitual via análise das policies + uma query de contagem).`,
  },
  {
    area: 'Avaliações e disputas',
    foco: `Na operação sim:
1) avaliacoes com nota fora de 1..5? Mais de uma avaliação por (pedido, de_papel)?
2) rating de entregadores/estabelecimentos dentro de 0..5 e coerente com as avaliações?
3) Avaliação em pedido que não está 'entregue' (não deveria existir)?
4) disputas: todas resolvíveis pelo admin? Disputa sem pedido? status fora do enum aberta/em_analise/resolvida?`,
  },
  {
    area: 'Confiabilidade do entregador',
    foco: `Confirmar/expandir o gap já suspeito:
1) total_entregas dos entregadores sim está em 0 mesmo com pedidos 'entregue' atribuídos a eles? (CONFIRMAR — trigger creditar_entregador não incrementa).
2) abandonos / cancel_pos_aceite estão sendo contados nos cancelamentos via cancelar_corrida_entregador?
3) O score de confiabilidade/ranking usa total_entregas? Se sim, está quebrado pela #1.
Liste o impacto no despacho.`,
  },
  {
    area: 'Cobertura e gaps de feature',
    foco: `Mapear o que NÃO foi exercitado (paths sem dados) na operação sim e no app:
1) Tabelas com ZERO linhas sim: comunicados, recargas, verificacoes, cancelamentos, pagamentos, rastreios, comprovantes — quais ficaram vazias e por quê (feature não exercitada vs trigger não disparou)?
2) Fluxos cliente-final (rastreio público, chat por token, abrir disputa por token) — não foram testados pelo motor; sinalizar como GAP de cobertura.
3) Recarga real / saque real dependem de Asaas (chave vazia) — sinalizar como não-testável até a chave.
Seja específico sobre o que falta testar pra cobertura 100%.`,
  },
];

const SCHEMA = {
  type: 'object',
  properties: {
    area: { type: 'string' },
    resumo: { type: 'string', description: 'veredito de 1-2 frases' },
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severidade: { type: 'string', enum: ['critico', 'alto', 'medio', 'baixo', 'ok'] },
          descricao: { type: 'string' },
          evidencia: { type: 'string', description: 'query + número que prova' },
          sugestao: { type: 'string' },
        },
        required: ['severidade', 'descricao', 'evidencia'],
      },
    },
  },
  required: ['area', 'resumo', 'gaps'],
};

phase('Auditoria');
log(`Auditando a operação sim em ${DIMENSOES.length} dimensões`);

const achados = await parallel(
  DIMENSOES.map((d) => () =>
    agent(
      `Você é auditor de QA da plataforma AppDelyvery (entrega B2B em Palmas-TO). O working dir é C:/Users/Usuario/appdelyvery. Há uma operação SIMULADA no banco (contas com email ~ '^sim\\.(est|ent)\\.'). Você roda SQL read-only com: node scripts/query.mjs "<SQL>" (conexão já configurada). Para testar fluxo autenticado, pode logar via REST como um usuário sim (senha Demo1234) usando o padrão dos scripts/verify-*.mjs.

DIMENSÃO: ${d.area}

${d.foco}

Rode as queries necessárias, interprete os números, e retorne os GAPS encontrados com evidência (a query e o número que prova). Se algo está correto, registre como severidade 'ok'. NÃO edite arquivos, NÃO altere dados — só leitura. Seja preciso e factual; cada gap precisa de evidência numérica.`,
      { label: `audit:${d.area.split(' ')[0]}`, phase: 'Auditoria', agentType: 'general-purpose', schema: SCHEMA }
    )
  )
);

const ok = achados.filter(Boolean);
const todos = ok.flatMap((a) => (a.gaps || []).map((g) => ({ ...g, area: a.area })));
const porSev = (s) => todos.filter((g) => g.severidade === s);
log(`Auditoria concluída: ${todos.length} achados (${porSev('critico').length} críticos, ${porSev('alto').length} altos)`);

return {
  resumo_por_area: ok.map((a) => ({ area: a.area, resumo: a.resumo, gaps: a.gaps?.length || 0 })),
  criticos: porSev('critico'),
  altos: porSev('alto'),
  medios: porSev('medio'),
  baixos: porSev('baixo'),
  ok: porSev('ok').map((g) => `${g.area}: ${g.descricao}`),
};
