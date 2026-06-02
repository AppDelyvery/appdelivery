import Link from "next/link";
import { Icon } from "./Icons";

export default function LegalShell({
  titulo,
  vigencia,
  children,
}: {
  titulo: string;
  vigencia: string;
  children: React.ReactNode;
}) {
  return (
    <div className="legal-wrap legal">
      <div className="legal-top">
        <div className="mark">
          <Icon name="moto" />
        </div>
        <div className="name">
          <b>APP</b>
          <span>DELYVERY</span>
        </div>
        <Link href="/" style={{ marginLeft: "auto", fontSize: 13, fontWeight: 600 }}>
          Início
        </Link>
      </div>

      <div className="legal-aviso" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Icon name="shield" style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} />
        <span>
          RASCUNHO — este texto é uma base e <b>precisa de revisão de um advogado</b> antes de ir ao ar. Não substitui
          parecer jurídico, sobretudo no tratamento de antecedentes criminais (dado sensível, LGPD).
        </span>
      </div>

      <h1>{titulo}</h1>
      <div className="vig">{vigencia}</div>
      {children}

      <div className="legal-foot">
        APPDELYVERY · Palmas-TO · <Link href="/termos">Termos de Uso</Link> ·{" "}
        <Link href="/privacidade">Política de Privacidade</Link>
      </div>
    </div>
  );
}
