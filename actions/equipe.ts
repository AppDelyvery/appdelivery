"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export type ConviteResult =
  | { ok: true; senhaTemp: string }
  | { semServiceRole: true }
  | { erro: string };

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
// Senha temporária fácil — segurança vem da troca no 1º acesso (padrão do projeto).
const senhaTemp = (nome: string) => {
  const primeiro = semAcento((nome || "membro").trim().split(/\s+/)[0] || "membro").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${primeiro || "membro"}2026`;
};

// Gerente/dono convida um funcionário: cria o login, o profile e o vínculo de membro.
// Criar usuário exige service role (CNPJ do dono). Sem a chave, devolve semServiceRole
// e o resto da estrutura segue pronta (mesmo padrão do Asaas/verificação).
export async function convidarMembro(email: string, nome: string, papel: "gerente" | "operador"): Promise<ConviteResult> {
  const mail = (email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return { erro: "E-mail inválido." };
  if (!nome.trim()) return { erro: "Informe o nome do funcionário." };
  if (papel !== "gerente" && papel !== "operador") return { erro: "Papel inválido." };

  const sb = await getServerSupabase();
  if (!sb) return { erro: "Sistema indisponível." };

  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) return { erro: "Faça login." };

  // só gerente/dono convida; resolve o estab pelo banco
  const { data: pleno } = await sb.rpc("estab_pleno");
  if (pleno !== true) return { erro: "Só gerente ou dono pode convidar." };
  const { data: estId } = await sb.rpc("estab_do_usuario");
  if (!estId) return { erro: "Negócio não encontrado." };

  const admin = getAdminSupabase();
  if (!admin) return { semServiceRole: true };

  const senha = senhaTemp(nome);

  // 1) cria o login (já confirmado — signup público está fechado)
  const { data: novo, error: e1 } = await admin.auth.admin.createUser({
    email: mail,
    password: senha,
    email_confirm: true,
    user_metadata: { role: "estabelecimento", nome: nome.trim() },
  });
  if (e1 || !novo?.user) {
    const msg = e1?.message ?? "";
    if (/already|exists|registered/i.test(msg)) return { erro: "Já existe uma conta com esse e-mail." };
    return { erro: "Não consegui criar o login." };
  }
  const uid = novo.user.id;

  // 2) profile (role estabelecimento → roteia /negocio) — service role bypassa RLS
  const { error: e2 } = await admin.from("profiles").upsert({ id: uid, role: "estabelecimento", nome: nome.trim() });
  if (e2) return { erro: "Login criado, mas falhou ao gravar o perfil. Fale com o suporte." };

  // 3) vínculo de membro
  const { error: e3 } = await admin
    .from("estabelecimento_membros")
    .insert({ estabelecimento_id: estId, profile_id: uid, papel });
  if (e3) return { erro: "Login criado, mas falhou ao vincular à equipe. Fale com o suporte." };

  // 4) read-after-write — prova de que vinculou (λ.prova-na-fonte)
  const { data: check } = await admin
    .from("estabelecimento_membros")
    .select("id")
    .eq("estabelecimento_id", estId)
    .eq("profile_id", uid)
    .maybeSingle();
  if (!check) return { erro: "Não consegui confirmar o vínculo após gravar." };

  return { ok: true, senhaTemp: senha };
}
