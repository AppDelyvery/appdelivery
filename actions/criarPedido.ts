"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { priceCalc, type Veiculo } from "@/lib/precos";
import { getConfig } from "@/lib/config";
import { dentroDaArea, haversineKm } from "@/lib/area";
import { fetchDirections } from "@/lib/mapbox";

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

  // #2 — área de cobertura: coleta E entrega têm que estar na região atendida (Palmas e arredores)
  if (!dentroDaArea(input.coletaLat, input.coletaLng) || !dentroDaArea(input.entregaLat, input.entregaLng))
    return { ok: false, motivo: "fora-da-area" };

  // #1 — distância AUTORITATIVA no server (não confia na do client pra precificar):
  // recomputa a rota; se o Mapbox falhar, usa o piso físico (linha reta) como teto de desconto.
  const rota = await fetchDirections([input.coletaLng, input.coletaLat], [input.entregaLng, input.entregaLat]);
  const piso = haversineKm(input.coletaLat, input.coletaLng, input.entregaLat, input.entregaLng);
  const distSegura = rota?.distKm ?? Math.max(input.distanciaKm ?? 0, piso);
  const durSegura = rota?.durMin ?? input.duracaoMin;

  // tetos autoritativos no server (cliente também limita, mas aqui é a fonte da verdade)
  const paradas = Math.min(5, Math.max(0, Math.floor(input.paradasExtras ?? 0)));
  const espera = Math.min(60, Math.max(0, Math.floor(input.minutosEspera ?? 0)));

  const cfg = await getConfig(sb);
  const pc = priceCalc(input.veiculo, distSegura, cfg, {
    paradasExtras: paradas,
    minutosEspera: espera,
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
      distancia_km: distSegura,
      duracao_min: durSegura,
      paradas_extras: paradas,
      minutos_espera: espera,
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
