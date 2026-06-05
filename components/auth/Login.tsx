"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";

// Manda cada papel pro seu painel.
function rotaPorPapel(role?: string) {
  if (role === "entregador") return "/entregador";
  if (role === "admin" || role === "operador") return "/admin";
  return "/negocio/novo-pedido";
}

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [checando, setChecando] = useState(true);

  // O PWA abre aqui (start_url). Se já há sessão, vai direto pro painel do papel —
  // não fica preso no login nem cai na vitrine.
  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) {
      setChecando(false);
      return;
    }
    let ativo = true;
    (async () => {
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (!ativo) return;
      if (session?.user) {
        const { data: perfil } = await sb.from("profiles").select("role").eq("id", session.user.id).single();
        if (!ativo) return;
        router.replace(rotaPorPapel((perfil as { role?: string } | null)?.role));
        return;
      }
      setChecando(false);
    })();
    return () => {
      ativo = false;
    };
  }, [router]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const sb = getBrowserSupabase();
    if (!sb) {
      setErro("Supabase não configurado (.env.local).");
      return;
    }
    setCarregando(true);
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;

      // Roteia pelo papel (lido do profile)
      const { data: perfil } = await sb.from("profiles").select("role").eq("id", data.user.id).single();
      router.push(rotaPorPapel((perfil as { role?: string } | null)?.role));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "E-mail ou senha inválidos.");
    } finally {
      setCarregando(false);
    }
  }

  if (checando) {
    return (
      <div className="login-screen">
        <div className="login-card" style={{ textAlign: "center", color: "var(--muted)" }}>
          <Icon name="spinner" /> Carregando…
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={entrar}>
        <div className="lg-logo">
          <div className="mark">
            <Icon name="moto" />
          </div>
          <div className="name">
            <b>APP</b>
            <span>DELYVERY</span>
          </div>
        </div>
        <div className="lg-sub">Entrar</div>

        <div className="field">
          <label>E-mail</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Senha</label>
          <input className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </div>

        {erro && (
          <div className="trust-banner" style={{ background: "var(--warn-bg)", borderColor: "#f3d6a8", color: "var(--warn)" }}>
            <Icon name="shield" />
            <div>{erro}</div>
          </div>
        )}

        <button className="btn btn-primary" type="submit" disabled={carregando} style={{ marginTop: 6 }}>
          <Icon name={carregando ? "spinner" : "arrow"} /> {carregando ? "Entrando…" : "Entrar"}
        </button>
        <div className="lg-foot">
          Não tem conta?{" "}
          <Link href="/cadastro" style={{ color: "var(--brand)", fontWeight: 700 }}>
            Cadastrar negócio
          </Link>
        </div>
      </form>
    </div>
  );
}
