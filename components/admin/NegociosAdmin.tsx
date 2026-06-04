"use client";

import { useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Negocio = { id: string; razao_social: string; cnpj: string | null; endereco: string | null; created_at: string };

export default function NegociosAdmin() {
  const [negocios, setNegocios] = useState<Negocio[]>([]);

  useEffect(() => {
    (async () => {
      const sb = getBrowserSupabase();
      if (!sb) return;
      const { data } = await sb.from("estabelecimentos").select("id,razao_social,cnpj,endereco,created_at").order("created_at", { ascending: false });
      if (data) setNegocios(data as Negocio[]);
    })();
  }, []);

  return (
    <AdminShell title="Negócios">
      <div className="card">
        <div className="card-h">
          <Icon name="building" />
          <h3>Negócios cadastrados</h3>
          <span className="right">{negocios.length}</span>
        </div>
        <table>
          <tbody>
            <tr><th>Negócio</th><th>CNPJ/CPF</th><th>Endereço</th></tr>
            {negocios.map((n) => (
              <tr key={n.id}>
                <td className="td-name">{n.razao_social}</td>
                <td>{n.cnpj ?? "—"}</td>
                <td style={{ color: "var(--muted)" }}>{n.endereco ?? "—"}</td>
              </tr>
            ))}
            {negocios.length === 0 && <tr><td colSpan={3} style={{ color: "var(--faint)", fontSize: 12.5 }}>Nenhum negócio ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
