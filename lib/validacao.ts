// Validação e máscara de documentos/telefone (cliente). Dígito verificador real.

export const soDigitos = (s: string) => (s || "").replace(/\D/g, "");

export function validarCPF(v: string): boolean {
  const c = soDigitos(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (base: string, pesoIni: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoIni - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(c.slice(0, 9), 10) === Number(c[9]) && dv(c.slice(0, 10), 11) === Number(c[10]);
}

export function validarCNPJ(v: string): boolean {
  const c = soDigitos(v);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const dv = (base: string) => {
    let soma = 0;
    let peso = base.length - 7;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * peso;
      peso = peso === 2 ? 9 : peso - 1;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(c.slice(0, 12)) === Number(c[12]) && dv(c.slice(0, 13)) === Number(c[13]);
}

// CNPJ (14) ou CPF de MEI (11) — usado no cadastro de negócio
export function validarCnpjOuCpf(v: string): boolean {
  const c = soDigitos(v);
  return c.length === 14 ? validarCNPJ(v) : validarCPF(v);
}

export function mascaraCPF(v: string): string {
  const c = soDigitos(v).slice(0, 11);
  return c
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function mascaraCnpjOuCpf(v: string): string {
  const c = soDigitos(v).slice(0, 14);
  if (c.length <= 11) return mascaraCPF(c);
  return c
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function mascaraTelefone(v: string): string {
  const c = soDigitos(v).slice(0, 11);
  if (c.length <= 10) return c.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  return c.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}
