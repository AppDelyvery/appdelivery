// Cliente Asaas — pagamentos/recarga/repasse. SÓ server-side (chave secreta).
// No-op sem ASAAS_API_KEY: retorna { configurado:false } e o fluxo segue sem travar,
// igual fizemos com a verificação. Quando a conta no CNPJ do dono existir, pluga a chave.
import { hasAsaas, ASAAS_API_KEY } from "./integracoes";

const BASE = process.env.ASAAS_ENV === "prod" ? "https://api.asaas.com/v3" : "https://sandbox.asaas.com/api/v3";
const headers = () => ({ access_token: ASAAS_API_KEY, "Content-Type": "application/json" });
const hoje = () => new Date().toISOString().slice(0, 10);

export type CobrancaPix = { configurado: boolean; id?: string; pixCopiaCola?: string; qrBase64?: string; erro?: string };
export type Transferencia = { configurado: boolean; id?: string; erro?: string };

// Cobrança Pix avulsa (recarga de carteira do lojista).
export async function criarCobrancaPix(opts: { valor: number; descricao: string; externalRef: string }): Promise<CobrancaPix> {
  if (!hasAsaas()) return { configurado: false };
  try {
    const r = await fetch(`${BASE}/payments`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ billingType: "PIX", value: opts.valor, dueDate: hoje(), description: opts.descricao, externalReference: opts.externalRef }),
    });
    const pay = await r.json();
    if (!pay?.id) return { configurado: true, erro: pay?.errors?.[0]?.description ?? "Falha ao criar cobrança." };
    const qr = await fetch(`${BASE}/payments/${pay.id}/pixQrCode`, { headers: headers() }).then((x) => x.json());
    return { configurado: true, id: pay.id, pixCopiaCola: qr?.payload, qrBase64: qr?.encodedImage };
  } catch (e) {
    return { configurado: true, erro: e instanceof Error ? e.message : "Erro de rede com o Asaas." };
  }
}

// Transferência Pix EXTERNA (repasse pra chave Pix do entregador CPF). Consome a franquia (100/mês PJ).
export async function transferirPix(opts: { chavePix: string; valor: number; descricao: string }): Promise<Transferencia> {
  if (!hasAsaas()) return { configurado: false };
  try {
    const r = await fetch(`${BASE}/transfers`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ value: opts.valor, pixAddressKey: opts.chavePix, description: opts.descricao }),
    });
    const t = await r.json();
    return t?.id ? { configurado: true, id: t.id } : { configurado: true, erro: t?.errors?.[0]?.description ?? "Falha na transferência." };
  } catch (e) {
    return { configurado: true, erro: e instanceof Error ? e.message : "Erro de rede com o Asaas." };
  }
}

// Transferência INTERNA entre contas Asaas (repasse pra SUBCONTA do entregador MEI). Grátis e instantânea
// (não consome a franquia de transferências externas). Usa o walletId guardado em entregadores.asaas_subconta_id.
export async function transferirParaWallet(opts: { walletId: string; valor: number; descricao?: string }): Promise<Transferencia> {
  if (!hasAsaas()) return { configurado: false };
  try {
    const r = await fetch(`${BASE}/transfers`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ value: opts.valor, walletId: opts.walletId, description: opts.descricao }),
    });
    const t = await r.json();
    return t?.id ? { configurado: true, id: t.id } : { configurado: true, erro: t?.errors?.[0]?.description ?? "Falha na transferência interna." };
  } catch (e) {
    return { configurado: true, erro: e instanceof Error ? e.message : "Erro de rede com o Asaas." };
  }
}

export type SubcontaResult = { configurado: boolean; walletId?: string; apiKey?: string; erro?: string };

// Cria uma subconta Asaas (marketplace) pro entregador MEI. SÓ CNPJ pode (regra BACEN). Retorna o
// walletId (guardar p/ repasse interno) + apiKey (mostrada UMA vez — guardar só se a subconta for operar sozinha).
export async function criarSubconta(opts: {
  name: string;
  email: string;
  cpfCnpj: string; // CNPJ do MEI
  mobilePhone?: string;
  incomeValue?: number;
  address?: string;
  addressNumber?: string;
  province?: string;
  postalCode?: string;
}): Promise<SubcontaResult> {
  if (!hasAsaas()) return { configurado: false };
  try {
    const r = await fetch(`${BASE}/accounts`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(opts),
    });
    const a = await r.json();
    if (!a?.walletId) return { configurado: true, erro: a?.errors?.[0]?.description ?? "Falha ao criar subconta." };
    return { configurado: true, walletId: a.walletId, apiKey: a.apiKey };
  } catch (e) {
    return { configurado: true, erro: e instanceof Error ? e.message : "Erro de rede com o Asaas." };
  }
}
