// Integrações externas do APPDELYVERY — todas plugáveis por env var.
// Hoje só checam presença de credencial; o cliente real entra quando a conta existir.
// Spec completa: build-spec/03-BACKEND-API.md.

// Supabase (banco/auth/realtime/storage)
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const hasSupabase = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Asaas (pagamento/split por subconta de entregador) — chave SÓ server-side.
export const ASAAS_API_KEY = process.env.ASAAS_API_KEY ?? "";
export const hasAsaas = () => ASAAS_API_KEY.length > 0;

// FlagCheck (antecedentes por CPF) — dado sensível LGPD, SÓ server-side, só admin.
export const FLAGCHECK_API_KEY = process.env.FLAGCHECK_API_KEY ?? "";
export const hasFlagCheck = () => FLAGCHECK_API_KEY.length > 0;

// Infosimples (CNH/CRLV via Senatran) — SÓ server-side.
export const INFOSIMPLES_TOKEN = process.env.INFOSIMPLES_TOKEN ?? "";
export const hasInfosimples = () => INFOSIMPLES_TOKEN.length > 0;

// idwall (biometria facial: face match + liveness + OCR) — SÓ server-side. Dado sensível LGPD.
// Alternativas plugáveis aqui: Unico/CAF (biometria) ou Serpro Datavalid (match oficial gov).
export const IDWALL_API_KEY = process.env.IDWALL_API_KEY ?? "";
export const hasIdwall = () => IDWALL_API_KEY.length > 0;
