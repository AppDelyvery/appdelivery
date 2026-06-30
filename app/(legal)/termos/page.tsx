import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";
import { TermosContent, VIGENCIA } from "@/components/legal/LegalContent";

export const metadata: Metadata = {
  title: "Termos de Uso · APPDELYVERY",
  description: "Termos e condições de uso da plataforma APPDELYVERY de entrega de encomendas em Palmas-TO.",
};

export default function Termos() {
  return (
    <LegalShell titulo="Termos de Uso" vigencia={VIGENCIA}>
      <TermosContent />
    </LegalShell>
  );
}
