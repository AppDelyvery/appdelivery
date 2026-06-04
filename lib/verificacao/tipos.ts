// Resultado padrão de uma checagem de verificação.
// aprovado: true=passou, false=reprovou, null=indeterminado/pendente (ex.: provedor não configurado).
export type VerifResultado = {
  configurado: boolean;
  aprovado: boolean | null;
  detalhe: string;
  raw?: unknown; // resposta crua do provedor (LGPD: guardar só no server/admin)
};

export const naoConfigurado = (nome: string): VerifResultado => ({
  configurado: false,
  aprovado: null,
  detalhe: `${nome} não configurado (defina a chave no .env / Vercel)`,
});
