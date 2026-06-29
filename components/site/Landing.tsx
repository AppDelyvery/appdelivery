import Link from "next/link";
import { Icon, type IconName } from "../Icons";

const PASSOS: { ic: IconName; t: string; s: string }[] = [
  { ic: "send", t: "Você pede a entrega", s: "coleta, destino e o que enviar — vê o preço na hora" },
  { ic: "shield", t: "Entregador verificado aceita", s: "o mais próximo, com antecedentes e CNH checados" },
  { ic: "pin", t: "Acompanha ao vivo", s: "você e seu cliente veem o trajeto no mapa, por link" },
  { ic: "checkThin", t: "Entregue com comprovante", s: "foto + assinatura de quem recebeu" },
];

const sec: React.CSSProperties = { maxWidth: 1040, margin: "0 auto", padding: "0 24px" };
const navLink: React.CSSProperties = { color: "#cbd5e1", fontWeight: 600, fontSize: 13.5, textDecoration: "none" };

// Mockup do hero — um pedido em rota, mostrando o selo "verificado" do entregador.
// Componente React real (sem 3D/imagem pesada), estilizado com os tokens do app.
function HeroMockup() {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 340,
        background: "#fff",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 34px 64px -22px rgba(13,20,36,.55)",
        color: "var(--ink)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--muted)" }}>Pedido #4821</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--brand)", background: "var(--brand-light)", padding: "4px 10px", borderRadius: 999 }}>
          A caminho
        </span>
      </div>

      <div style={{ display: "grid", gap: 11, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--brand)", marginTop: 4, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Ótica Visão Center</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Q. 104 Norte · coleta</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--go)", marginTop: 4, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Cliente · Arse 122</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Plano Diretor Sul · entrega</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", background: "var(--bg)", borderRadius: 12 }}>
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: "linear-gradient(135deg,#818cf8,var(--brand))",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontWeight: 800,
            fontSize: 13.5,
            flexShrink: 0,
          }}
        >
          MR
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Mateus R.</div>
          <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Moto · nota 4,9</div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 10.5,
            fontWeight: 800,
            color: "var(--go-dark,#047857)",
            background: "color-mix(in srgb, var(--go) 14%, transparent)",
            padding: "4px 8px",
            borderRadius: 999,
          }}
        >
          <Icon name="shield" style={{ width: 12, height: 12 }} /> Verificado
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>
        <Icon name="clock" style={{ width: 15, height: 15 }} /> Chega em ~12 min · acompanhe no mapa
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      {/* TOPO NAVY: nav + hero */}
      <div style={{ position: "relative", overflow: "hidden", background: "#0d1424", color: "#fff" }}>
        {/* glow índigo sutil atrás do mockup */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 74% 36%, rgba(79,70,229,.26), transparent 56%)",
            pointerEvents: "none",
          }}
        />

        {/* NAV */}
        <nav style={{ ...sec, position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", height: 72, gap: 16 }}>
          <div className="lg-logo" style={{ margin: 0 }}>
            <div className="mark">
              <Icon name="moto" />
            </div>
            <div className="name" style={{ fontSize: 19, color: "#fff" }}>
              <b style={{ color: "#fff" }}>APP</b>
              <span style={{ color: "#818cf8" }}>DELYVERY</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <a href="#como-funciona" style={navLink} className="hide-sm">Como funciona</a>
            <a href="#seguranca" style={navLink} className="hide-sm">Segurança</a>
            <Link href="/cadastro/entregador" style={navLink} className="hide-sm">Para entregadores</Link>
            <Link href="/login" style={{ color: "#fff", fontWeight: 700, fontSize: 13.5, textDecoration: "none", opacity: 0.9 }}>
              Entrar
            </Link>
            <Link href="/cadastro" className="btn btn-primary" style={{ width: "auto", padding: "9px 16px", textDecoration: "none" }}>
              Cadastrar minha loja
            </Link>
          </div>
        </nav>

        {/* HERO */}
        <header
          style={{
            ...sec,
            position: "relative",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 44,
            alignItems: "center",
            padding: "48px 24px 68px",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 13px",
                borderRadius: 999,
                background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(255,255,255,.13)",
                fontSize: 12.5,
                fontWeight: 700,
                color: "#c7d2fe",
                marginBottom: 22,
              }}
            >
              <Icon name="shield" style={{ width: 15, height: 15, color: "var(--go)" }} /> Entregador verificado por antecedentes
            </div>
            <h1 style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-1.7px", lineHeight: 1.05, color: "#fff", margin: 0 }}>
              Suas entregas com quem você <span style={{ color: "#818cf8" }}>pode confiar</span>.
            </h1>
            <p style={{ fontSize: 17, color: "#cbd5e1", lineHeight: 1.6, margin: "20px 0 0", maxWidth: 520 }}>
              Entrega sob demanda em Palmas com entregador checado por <b style={{ color: "#fff" }}>antecedentes, CNH e identidade</b>.
              Rastreio em tempo real, sem mensalidade — você só paga por entrega.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
              <Link href="/cadastro" className="btn btn-primary" style={{ width: "auto", padding: "14px 24px", textDecoration: "none" }}>
                <Icon name="building" /> Cadastrar minha loja
              </Link>
              <a
                href="#como-funciona"
                className="btn"
                style={{ width: "auto", padding: "14px 24px", textDecoration: "none", background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,.22)" }}
              >
                Ver como funciona
              </a>
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 26, flexWrap: "wrap" }}>
              {["Antecedentes checados", "Rastreio ao vivo", "Sem mensalidade"].map((t) => (
                <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#94a3b8", fontWeight: 600 }}>
                  <Icon name="checkThin" style={{ width: 15, height: 15, color: "var(--go)" }} /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* MOCKUP — pedido em rota */}
          <div style={{ display: "grid", placeItems: "center" }}>
            <HeroMockup />
          </div>
        </header>
      </div>

      {/* DIFERENCIAL */}
      <section id="seguranca" style={{ ...sec, padding: "20px 24px" }}>
        <div className="trust-banner" style={{ marginTop: 0, fontSize: 14, padding: "18px 20px" }}>
          <Icon name="shield" />
          <div>
            <b>Verificação de antecedentes é regra pra todo entregador — feita de forma ativa e mostrada pra você.</b> Antes de
            cada entrega, você vê o selo de quem está com a ficha checada. Mais segurança pra mandar encomenda de valor.
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" style={{ ...sec, padding: "36px 24px 16px" }}>
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
