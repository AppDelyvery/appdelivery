import Link from "next/link";
import { Icon, type IconName } from "../Icons";

const PASSOS: { ic: IconName; t: string; s: string }[] = [
  { ic: "send", t: "Você pede a entrega", s: "coleta, destino e o que enviar — vê o preço na hora" },
  { ic: "shield", t: "Entregador verificado aceita", s: "o mais próximo, com antecedentes e CNH checados" },
  { ic: "pin", t: "Acompanha ao vivo", s: "você e seu cliente veem o trajeto no mapa, por link" },
  { ic: "checkThin", t: "Entregue com comprovante", s: "foto + assinatura de quem recebeu" },
];

const sec: React.CSSProperties = { maxWidth: 1040, margin: "0 auto", padding: "0 24px" };

export default function Landing() {
  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      {/* NAV */}
      <nav style={{ ...sec, display: "flex", alignItems: "center", justifyContent: "space-between", height: 70 }}>
        <div className="lg-logo" style={{ margin: 0 }}>
          <div className="mark">
            <Icon name="moto" />
          </div>
          <div className="name" style={{ fontSize: 19 }}>
            <b>APP</b>
            <span>DELYVERY</span>
          </div>
        </div>
        <Link href="/login" className="btn btn-ghost" style={{ width: "auto", padding: "9px 18px", textDecoration: "none" }}>
          Entrar
        </Link>
      </nav>

      {/* HERO */}
      <header style={{ ...sec, textAlign: "center", padding: "56px 24px 36px" }}>
        <div className="vbadge" style={{ margin: "0 auto 20px", width: "max-content" }}>
          <Icon name="shield" /> ENTREGADOR VERIFICADO POR ANTECEDENTES
        </div>
        <h1 style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-1.6px", lineHeight: 1.08, maxWidth: 760, margin: "0 auto", color: "var(--ink)" }}>
          Entregas para o seu negócio, com quem você <span style={{ color: "var(--brand)" }}>pode confiar</span>.
        </h1>
        <p style={{ fontSize: 17, color: "var(--ink-2)", maxWidth: 600, margin: "20px auto 0", lineHeight: 1.6 }}>
          Documento, peça, encomenda de valor — coletado e entregue em Palmas por entregador com{" "}
          <b>antecedentes e CNH checados</b>. Você e seu cliente acompanham tudo ao vivo no mapa.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 30, flexWrap: "wrap" }}>
          <Link href="/cadastro" className="btn btn-primary" style={{ width: "auto", padding: "14px 26px", textDecoration: "none" }}>
            <Icon name="building" /> Cadastrar meu negócio
          </Link>
          <Link href="/cadastro/entregador" className="btn btn-ghost" style={{ width: "auto", padding: "14px 26px", textDecoration: "none" }}>
            <Icon name="moto" /> Sou entregador
          </Link>
        </div>
      </header>

      {/* DIFERENCIAL */}
      <section style={{ ...sec, padding: "20px 24px" }}>
        <div className="trust-banner" style={{ marginTop: 0, fontSize: 14, padding: "18px 20px" }}>
          <Icon name="shield" />
          <div>
            <b>Verificação de antecedentes é regra pra todo entregador — feita de forma ativa e mostrada pra você.</b> Antes de
            cada entrega, você vê o selo de quem está com a ficha checada. Mais segurança pra mandar encomenda de valor.
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section style={{ ...sec, padding: "36px 24px 16px" }}>
        <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 800, letterSpacing: "-.6px", marginBottom: 28, color: "var(--ink)" }}>
          Como funciona
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
          {PASSOS.map((p, i) => (
            <div className="card" key={p.t} style={{ margin: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--brand-light)", display: "grid", placeItems: "center", marginBottom: 12 }}>
                <Icon name={p.ic} style={{ width: 19, height: 19, color: "var(--brand)" }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.2px" }}>
                {i + 1}. {p.t}
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 5, lineHeight: 1.5 }}>{p.s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PARA ENTREGADORES */}
      <section style={{ ...sec, padding: "20px 24px 16px" }}>
        <div className="card" style={{ margin: 0, background: "var(--ink)", border: "none", color: "#fff", display: "grid", gridTemplateColumns: "1fr", gap: 18 }}>
          <div>
            <div className="vbadge" style={{ background: "rgba(255,255,255,.12)", color: "#fff", width: "max-content", marginBottom: 12 }}>
              <Icon name="moto" /> PARA ENTREGADORES
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.5px", color: "#fff", lineHeight: 1.15 }}>
              Rode com um app moderno e ganhe entregando.
            </h2>
            <ul style={{ margin: "14px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 9 }}>
              {[
                "Ofertas no mapa, do jeito que você já conhece dos apps de corrida",
                "Você fica com 80% do frete de cada entrega",
                "Sua ficha checada vale mais — empresa confia em quem é verificado",
                "Conecta e desconecta quando quiser, sem meta",
              ].map((t) => (
                <li key={t} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 14, opacity: 0.92 }}>
                  <Icon name="checkThin" style={{ width: 16, height: 16, color: "var(--go)", flexShrink: 0, marginTop: 2 }} /> {t}
                </li>
              ))}
            </ul>
            <Link href="/cadastro/entregador" className="btn btn-go" style={{ width: "max-content", padding: "13px 24px", marginTop: 18, textDecoration: "none" }}>
              <Icon name="moto" /> Quero ser entregador
            </Link>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ ...sec, padding: "40px 24px 56px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, var(--go-dark), var(--go))",
            borderRadius: 22,
            padding: 44,
            textAlign: "center",
            color: "#fff",
          }}
        >
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.5px", color: "#fff" }}>
            Sua encomenda na mão certa, em Palmas.
          </h2>
          <p style={{ fontSize: 15, opacity: 0.92, maxWidth: 540, margin: "12px auto 24px", lineHeight: 1.55 }}>
            Cadastre seu negócio e faça a primeira entrega com rastreio ao vivo e comprovante.
          </p>
          <Link href="/cadastro" className="btn" style={{ width: "auto", padding: "14px 28px", background: "#fff", color: "var(--go-dark)", textDecoration: "none" }}>
            <Icon name="arrow" /> Começar agora
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid var(--line)", padding: "26px 24px", textAlign: "center", color: "var(--muted)", fontSize: 12.5 }}>
        APPDELYVERY · Logística sob demanda · Palmas-TO ·{" "}
        <Link href="/termos" style={{ color: "var(--muted)", fontWeight: 600 }}>
          Termos
        </Link>{" "}
        ·{" "}
        <Link href="/privacidade" style={{ color: "var(--muted)", fontWeight: 600 }}>
          Privacidade
        </Link>
      </footer>
    </div>
  );
}
