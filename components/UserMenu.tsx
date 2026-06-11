"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export default function UserMenu() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb.auth.getUser();
      setEmail(data.user?.email ?? null);
    })();
  }, []);

  const sair = async () => {
    const sb = getBrowserSupabase();
    if (sb) await sb.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (!email) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span className="topbar-email" style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>
      <button className="btn btn-ghost" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }} onClick={sair}>
        <Icon name="arrow" /> Sair
      </button>
    </div>
  );
}
