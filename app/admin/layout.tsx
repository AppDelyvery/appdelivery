import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { rotaPorPapel } from "@/lib/papel";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Gate por papel: só admin/operador. Outro papel volta pra sua home (não pro /login).
  const sb = await getServerSupabase();
  if (sb) {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) redirect("/login");
    const { data: perfil } = await sb.from("profiles").select("role").eq("id", user.id).single();
    const role = (perfil as { role?: string } | null)?.role;
    if (role !== "admin" && role !== "operador") redirect(rotaPorPapel(role));
  }
  return <>{children}</>;
}
