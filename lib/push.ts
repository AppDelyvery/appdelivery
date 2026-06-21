"use client";

// Web Push (client) — registra o service worker, pede permissão e salva a assinatura.
// Best-effort e idempotente: no-op sem a chave pública VAPID, sem suporte do navegador,
// ou se o usuário negou. Chame a partir de um gesto do usuário (ex.: "Conectar").
import { getBrowserSupabase } from "@/lib/supabase/browser";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlB64ToUint8Array(base64: string): Uint8Array {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerPush(): Promise<void> {
  try {
    if (typeof window === "undefined") return;
    if (!VAPID || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    if (Notification.permission === "denied") return;

    const reg = await navigator.serviceWorker.register("/sw.js");

    if (Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return;
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID) as unknown as BufferSource,
      });
    }

    const json = sub.toJSON();
    if (!json.keys?.p256dh || !json.keys?.auth) return;
    const sb = getBrowserSupabase();
    if (!sb) return;
    await sb.rpc("salvar_push_subscription", {
      p_endpoint: sub.endpoint,
      p_p256dh: json.keys.p256dh,
      p_auth: json.keys.auth,
    });
  } catch {
    // silencioso — push é best-effort
  }
}
