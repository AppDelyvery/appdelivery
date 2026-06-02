"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { Veiculo } from "@/lib/precos";

export default function CadastroEntregador() {
  const router = useRouter();
  const [form, setForm] = useState({ nome: "", email: "", senha: "", telefone: "", cpf: "" });
  const [veh, setVeh] = useState<Veiculo>("moto");
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
    setCarregando(true);
    try {
      const { data: signup, error: e1 } = await sb.auth.signUp({
        email: form.email,
        password: form.senha,
        options: { data: { role: "entregador", nome: form.nome } },
      });
      if (e1) throw e1;
      const user = signup.user;
      if (!user) throw new Error("Conta criada, mas sem sessão. Confirme se a confirmação de e-mail está desligada.");

      const { error: e2 } = await sb
        .from("profiles")
        .insert({ id: user.id, role: "entregador", nome: form.nome, telefone: form.telefone || null });
      if (e2) throw e2;

      const { error: e3 } = await sb.from("entregadores").insert({
        profile_id: user.id,
        nome: form.nome,
        cpf: form.cpf,
        vehicle_type: veh,
      });
      if (e3) throw e3;

      // read-after-write (λ.prova-na-fonte)
      const { data: check, error: e4 } = await sb
        .from("entregadores")
        .select("id, status")
        .eq("profile_id", user.id)
        .single();
      if (e4 || !check) throw e4 ?? new Error("Não consegui reler o entregador após gravar.");

      router.push("/entregador");
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
        <div className="lg-sub">Seja um entregador verificado</div>

        <div className="field">
          <label>Nome completo</label>
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
          <input className="input" value={form.telefone} onChange={set("telefone")} />
        </div>
        <div className="field">
          <label>CPF</label>
          <input className="input" value={form.cpf} onChange={set("cpf")} required />
        </div>
        <div className="field">
          <label>Veículo</label>
          <div className="veh-toggle">
            <div className={`veh-opt${veh === "moto" ? " sel" : ""}`} onClick={() => setVeh("moto")}>
              <Icon name="moto" />
              <span className="vl">Moto</span>
            </div>
            <div className={`veh-opt${veh === "carro" ? " sel" : ""}`} onClick={() => setVeh("carro")}>
              <Icon name="car" />
              <span className="vl">Carro</span>
            </div>
            <div className={`veh-opt${veh === "van" ? " sel" : ""}`} onClick={() => setVeh("van")}>
              <Icon name="van" />
              <span className="vl">Van</span>
            </div>
          </div>
        </div>

        {erro && (
          <div className="trust-banner" style={{ background: "var(--warn-bg)", borderColor: "#f3d6a8", color: "var(--warn)" }}>
            <Icon name="shield" />
            <div>{erro}</div>
          </div>
        )}

        <button className="btn btn-primary" type="submit" disabled={carregando} style={{ marginTop: 6 }}>
          <Icon name={carregando ? "spinner" : "checkThin"} /> {carregando ? "Criando conta…" : "Criar conta de entregador"}
        </button>
        <div className="lg-foot">
          Depois você envia os documentos para a verificação de antecedentes.
          <br />
          Já tem conta?{" "}
          <Link href="/login" style={{ color: "var(--brand)", fontWeight: 700 }}>
            Entrar
          </Link>
        </div>
      </form>
    </div>
  );
}
