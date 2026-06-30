"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "../Icons";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { Veiculo } from "@/lib/precos";
import { validarCPF, mascaraCPF, mascaraTelefone } from "@/lib/validacao";
import Turnstile, { TURNSTILE_ENABLED } from "./Turnstile";
import { registrarConsentimentos } from "@/lib/legal";
import LegalModal, { type LegalDoc } from "@/components/legal/LegalModal";

export default function CadastroEntregador() {
  const router = useRouter();
  const [form, setForm] = useState({ nome: "", email: "", senha: "", telefone: "", cpf: "" });
  const [veh, setVeh] = useState<Veiculo>("moto");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [aceiteTermos, setAceiteTermos] = useState(false);
  const [aceiteVerif, setAceiteVerif] = useState(false);
  const [aceiteMkt, setAceiteMkt] = useState(false);
  const [modalDoc, setModalDoc] = useState<LegalDoc | null>(null);

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
    if (!validarCPF(form.cpf)) {
      setErro("CPF inválido. Confira os números.");
      return;
    }
    if (TURNSTILE_ENABLED && !captcha) {
      setErro("Confirme o desafio anti-robô antes de continuar.");
      return;
    }
    if (!aceiteTermos) {
      setErro("Para criar a conta, é preciso aceitar os Termos do Entregador e a Política de Privacidade.");
      return;
    }
    if (!aceiteVerif) {
      setErro("É preciso autorizar a verificação de antecedentes e CNH para ser um entregador verificado.");
      return;
    }
    setCarregando(true);
    try {
      const { data: signup, error: e1 } = await sb.auth.signUp({
        email: form.email,
        password: form.senha,
        options: { data: { role: "entregador", nome: form.nome }, captchaToken: captcha ?? undefined },
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

      // consentimentos LGPD (aceite demonstrável + verificação destacada) + read-after-write interno
      await registrarConsentimentos(sb, user.id, [
        { tipo: "termos_entregador", aceito: true },
        { tipo: "privacidade", aceito: true },
        { tipo: "verificacao_sensivel", aceito: true },
        { tipo: "marketing", aceito: aceiteMkt },
      ]);

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
          <input className="input" value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: mascaraTelefone(e.target.value) }))} inputMode="numeric" placeholder="(63) 90000-0000" />
        </div>
        <div className="field">
          <label>CPF</label>
          <input className="input" value={form.cpf} onChange={(e) => setForm((f) => ({ ...f, cpf: mascaraCPF(e.target.value) }))} inputMode="numeric" placeholder="000.000.000-00" required />
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

        <Turnstile onToken={setCaptcha} />

        <label className="consent">
          <input type="checkbox" checked={aceiteTermos} onChange={(e) => setAceiteTermos(e.target.checked)} />
          <span className="ct">
            Li e concordo com os{" "}
            <button type="button" className="lk" onClick={() => setModalDoc("termos")}>Termos do Entregador</button> e a{" "}
            <button type="button" className="lk" onClick={() => setModalDoc("privacidade")}>Política de Privacidade</button>.
          </span>
        </label>
        <label className="consent destaque">
          <input type="checkbox" checked={aceiteVerif} onChange={(e) => setAceiteVerif(e.target.checked)} />
          <span className="ct">
            Estou ciente e <b>autorizo a verificação dos meus antecedentes criminais e da minha CNH</b> para
            fins de segurança da operação, na forma da Política de Privacidade.
          </span>
        </label>
        <label className="consent">
          <input type="checkbox" checked={aceiteMkt} onChange={(e) => setAceiteMkt(e.target.checked)} />
          <span className="ct">
            Aceito receber comunicados e oportunidades por WhatsApp e e-mail. <i>(Opcional)</i>
          </span>
        </label>

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
      <LegalModal doc={modalDoc} onClose={() => setModalDoc(null)} />
    </div>
  );
}
