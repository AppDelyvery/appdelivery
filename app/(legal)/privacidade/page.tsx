import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";
import { PrivacidadeContent, VIGENCIA } from "@/components/legal/LegalContent";

export const metadata: Metadata = {
  title: "Política de Privacidade · APPDELYVERY",
  description: "Como o APPDELYVERY trata dados pessoais, incluindo dados sensíveis (antecedentes), conforme a LGPD.",
};

export default function Privacidade() {
  return (
    <LegalShell titulo="Política de Privacidade" vigencia={VIGENCIA}>
      <PrivacidadeContent />
    </LegalShell>
  );
}
