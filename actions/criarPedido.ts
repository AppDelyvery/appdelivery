"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { priceCalc, type Veiculo } from "@/lib/precos";
import { getConfig } from "@/lib/config";

export type NovoPedidoInput = {
  coletaEndereco: string;
  coletaLat: number;
  coletaLng: number;
  entregaEndereco: string;
  entregaLat: number;
  entregaLng: number;
  veiculo: Veiculo;
  conteudo?: string;
  valorDeclarado?: number;
  distanciaKm: number;
  duracaoMin: number;
  clienteFinalNome?: string;
  clienteFinalTelefone?: string;
  retornar?: boolean;
  paradasExtras?: number;
  minutosEspera?: number;
};

export type CriarPedidoResult =
  | { ok: true; pedidoId: string; trackingToken: string }
  | { ok: false; motivo: string };

// Cria o pedido do lojista logado: calcula preço, grava em `pedidos` (status 'buscando')
// e relê a row (λ.prova-na-fonte). O matching/oferta vem depois.
export async function criarPedido(input: NovoPedidoInput): Promise<CriarPedidoResult> {
  const sb = await getServerSupabase();
  if (!sb) return { ok: false, motivo: "supabase-nao-configurado" };

  const { data: auth } = await sb.auth.getUser();
  const user = auth.user;
  if (!user) return { ok: false, motivo: "nao-autenticado" };

  // estabelecimento do usuário (dono OU membro: gerente/operador) — resolve pelo banco
  const { data: estId } = await sb.rpc("estab_do_usuario");
  if (!estId) return { ok: false, motivo: "estabelecimento-nao-encontrado" };
  const { data: est } = await sb.from("estabelecimentos").select("ativo").eq("id", estId).maybeSingle();
  if ((est as { ativo?: boolean } | null)?.ativo === false) return { ok: false, motivo: "negocio-suspenso" };

  const cfg = await getConfig(sb);
  const pc = priceCalc(input.veiculo, input.distanciaKm, cfg, {
    paradasExtras: input.paradasExtras,
    minutosEspera: input.minutosEspera,
  });

  const { data: novo, error: eIns } = await sb
    .from("pedidos")
    .insert({
      estabelecimento_id: estId as string,
      coleta_endereco: input.coletaEndereco,
      coleta_lat: input.coletaLat,
      coleta_lng: input.coletaLng,
      entrega_endereco: input.entregaEndereco,
      entrega_lat: input.entregaLat,
      entrega_lng: input.entregaLng,
      descricao: input.conteudo ?? null,
      valor_declarado: input.valorDeclarado ?? null,
      cliente_final_nome: input.clienteFinalNome ?? null,
      cliente_final_telefone: input.clienteFinalTelefone ?? null,
      vehicle_type: input.veiculo,
      distancia_km: input.distanciaKm,
      duracao_min: input.duracaoMin,
      paradas_extras: Math.max(0, Math.floor(input.paradasExtras ?? 0)),
      minutos_espera: Math.max(0, Math.floor(input.minutosEspera ?? 0)),
      preco_total: pc.total,
      preco_entregador: pc.driver,
      preco_plataforma: pc.taxa,
      retornar: input.retornar ?? false,
      status: "buscando",
    })
    .select("id, tracking_token")
    .single();
  if (eIns || !novo) {
    const m = eIns?.message ?? "";
    return { ok: false, motivo: m.includes("saldo-insuficiente") ? "saldo-insuficiente" : m || "falha-ao-criar" };
  }

  // read-after-write: confirma que a row existe antes de declarar sucesso
  const row = novo as { id: string; tracking_token: string };
  const { data: check } = await sb.from("pedidos").select("id").eq("id", row.id).single();
  if (!check) return { ok: false, motivo: "nao-confirmado-na-fonte" };

  return { ok: true, pedidoId: row.id, trackingToken: row.tracking_token };
}
