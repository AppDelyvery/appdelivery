"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { validarCnpjOuCpf, mascaraCnpjOuCpf, mascaraTelefone } from "@/lib/validacao";

export default function CadastroNegocio() {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    telefone: "",
    razao: "",
    cnpj: "",
    endereco: "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const sb = getBrowserSupabase();
    if (!sb) {
      setErro("Supabase não configurado (.env.local).");
      return;
    }
    if (form.cnpj && !validarCnpjOuCpf(form.cnpj)) {
      setErro("CNPJ/CPF inválido. Confira os números (ou deixe em branco).");
      return;
    }
    setCarregando(true);
    try {
      // 1) cria a conta (auth.users) com metadados do papel
      const { data: signup, error: e1 } = await sb.auth.signUp({
        email: form.email,
        password: form.senha,
        options: { data: { role: "estabelecimento", nome: form.nome } },
      });
      if (e1) throw e1;
      const user = signup.user;
      if (!user) throw new Error("Conta criada, mas sem sessão. Confirme se a confirmação de e-mail está desligada.");

      // 2) profile (RLS: id = auth.uid())
      const { error: e2 } = await sb
        .from("profiles")
        .insert({ id: user.id, role: "estabelecimento", nome: form.nome, telefone: form.telefone || null });
      if (e2) throw e2;

      // 3) estabelecimento (RLS: profile_id = auth.uid())
      const { error: e3 } = await sb.from("estabelecimentos").insert({
        profile_id: user.id,
        razao_social: form.razao,
        cnpj: form.cnpj || null,
        endereco: form.endereco || null,
      });
      if (e3) throw e3;

      // 4) read-after-write — a única prova de que gravou (λ.prova-na-fonte)
      const { data: check, error: e4 } = await sb
        .from("estabelecimentos")
        .select("id, razao_social")
        .eq("profile_id", user.id)
        .single();
      if (e4 || !check) throw e4 ?? new Error("Não consegui reler o estabelecimento após gravar.");

      router.push("/negocio/novo-pedido");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha no cadastro.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={enviar}>
        <div className="lg-logo">
          <div className="mark">
            <Icon name="moto" />
          </div>
          <div className="name">
            <b>APP</b>
            <span>DELYVERY</span>
          </div>
        </div>
        <div className="lg-sub">Cadastre seu negócio</div>

        <div className="field">
          <label>Nome do responsável</label>
          <input className="input" value={form.nome} onChange={set("nome")} required />
        </div>
        <div className="field">
          <label>E-mail</label>
          <input className="input" type="email" value={form.email} onChange={set("email")} required />
        </div>
        <div className="field">
          <label>Senha</label>
          <input className="input" type="password" value={form.senha} onChange={set("senha")} minLength={6} required />
        </div>
        <div className="field">
          <label>WhatsApp</label>
          <input className="input" value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: mascaraTelefone(e.target.value) }))} inputMode="numeric" placeholder="(63) 90000-0000" />
        </div>
        <div className="field">
          <label>Nome do negócio</label>
          <input className="input" value={form.razao} onChange={set("razao")} required />
        </div>
        <div className="field">
          <label>CNPJ ou CPF (MEI)</label>
          <input className="input" value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: mascaraCnpjOuCpf(e.target.value) }))} inputMode="numeric" placeholder="00.000.000/0000-00" />
        </div>
        <div className="field">
          <label>Endereço de coleta</label>
          <input className="input" value={form.endereco} onChange={set("endereco")} />
        </div>

        {erro && (
          <div className="trust-banner" style={{ background: "var(--warn-bg)", borderColor: "#f3d6a8", color: "var(--warn)" }}>
            <Icon name="shield" />
            <div>{erro}</div>
          </div>
        )}

        <button className="btn btn-primary" type="submit" disabled={carregando} style={{ marginTop: 6 }}>
          <Icon name={carregando ? "spinner" : "checkThin"} /> {carregando ? "Criando conta…" : "Criar conta e começar"}
        </button>
        <div className="lg-foot">
          Já tem conta?{" "}
          <Link href="/login" style={{ color: "var(--brand)", fontWeight: 700 }}>
            Entrar
          </Link>
        </div>
      </form>
    </div>
  );
}
