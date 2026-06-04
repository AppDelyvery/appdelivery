import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Auth-gate: só admin/operador. Sem Supabase configurado, libera (modo dev/demo).
  const sb = await getServerSupabase();
  if (sb) {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) redirect("/login");
    const { data: perfil } = await sb.from("profiles").select("role").eq("id", user.id).single();
    const role = (perfil as { role?: string } | null)?.role;
    if (role !== "admin" && role !== "operador") redirect("/login");
  }
  return <>{children}</>;
}
