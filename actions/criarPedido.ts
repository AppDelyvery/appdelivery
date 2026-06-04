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

  // estabelecimento do usuário logado
  const { data: est, error: eEst } = await sb
    .from("estabelecimentos")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  if (eEst || !est) return { ok: false, motivo: "estabelecimento-nao-encontrado" };

  const cfg = await getConfig(sb);
  const pc = priceCalc(input.veiculo, input.distanciaKm, cfg);

  const { data: novo, error: eIns } = await sb
    .from("pedidos")
    .insert({
      estabelecimento_id: (est as { id: string }).id,
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
      preco_total: pc.total,
      preco_entregador: pc.driver,
      preco_plataforma: pc.taxa,
      status: "buscando",
    })
    .select("id, tracking_token")
    .single();
  if (eIns || !novo) return { ok: false, motivo: eIns?.message ?? "falha-ao-criar" };

  // read-after-write: confirma que a row existe antes de declarar sucesso
  const row = novo as { id: string; tracking_token: string };
  const { data: check } = await sb.from("pedidos").select("id").eq("id", row.id).single();
  if (!check) return { ok: false, motivo: "nao-confirmado-na-fonte" };

  return { ok: true, pedidoId: row.id, trackingToken: row.tracking_token };
}
