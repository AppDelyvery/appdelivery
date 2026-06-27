"use client";

import { getBrowserSupabase } from "./supabase/browser";
import { compressImage, DELIVERY_PHOTO_CFG } from "./compress-image";

// Comprime a foto do comprovante antes de subir (3G em campo). Fallback pro original se a compressão
// falhar — NUNCA bloquear a finalização da entrega por causa disso (melhor foto pesada que entrega travada).
async function prep(foto: File | null): Promise<File | null> {
  if (!foto) return null;
  const r = await compressImage(foto, DELIVERY_PHOTO_CFG);
  return r.ok ? r.file : foto;
}

// Sobe o arquivo no bucket `comprovantes` e devolve a URL pública. null se falhar (bucket/policy).
async function upload(pedidoId: string, file: Blob, tipo: string): Promise<string | null> {
  const sb = getBrowserSupabase();
  if (!sb) return null;
  const ext = file.type.includes("png") ? "png" : "jpg";
  const path = `${pedidoId}/${tipo}-${Date.now()}.${ext}`;
  const { error } = await sb.storage.from("comprovantes").upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (error) return null;
  return sb.storage.from("comprovantes").getPublicUrl(path).data.publicUrl;
}

const dataUrlToBlob = async (d: string) => (await fetch(d)).blob();

// Registra a coleta (foto) → status coletado. Retorna 'ok' | motivo.
export async function registrarColeta(pedidoId: string, foto: File | null): Promise<string> {
  const sb = getBrowserSupabase();
  if (!sb) return "sem-backend";
  const url = foto ? await upload(pedidoId, (await prep(foto))!, "coleta") : null;
  const { data, error } = await sb.rpc("registrar_coleta", { p_pedido_id: pedidoId, p_foto_url: url ?? "" });
  if (error) return error.message;
  return (data as string) ?? "erro";
}

// Registra a entrega (foto + assinatura) → status entregue. Retorna 'ok' | motivo.
export async function registrarEntrega(pedidoId: string, foto: File | null, assinaturaDataUrl: string | null, codigo: string): Promise<string> {
  const sb = getBrowserSupabase();
  if (!sb) return "sem-backend";
  const fotoUrl = foto ? await upload(pedidoId, (await prep(foto))!, "entrega") : null;
  const assBlob = assinaturaDataUrl ? await dataUrlToBlob(assinaturaDataUrl) : null;
  const assUrl = assBlob ? await upload(pedidoId, assBlob, "assinatura") : null;
  const { data, error } = await sb.rpc("registrar_entrega", { p_pedido_id: pedidoId, p_foto_url: fotoUrl ?? "", p_assinatura_url: assUrl ?? "", p_codigo: codigo });
  if (error) return error.message;
  return (data as string) ?? "erro";
}
