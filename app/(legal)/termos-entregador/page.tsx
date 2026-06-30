import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";
import { TermosEntregadorContent, VIGENCIA } from "@/components/legal/LegalContent";

export const metadata: Metadata = {
  title: "Termos do Entregador Parceiro · APPDELYVERY",
  description: "Termos de uso para o entregador parceiro autônomo da plataforma APPDELYVERY em Palmas-TO.",
};

export default function TermosEntregador() {
  return (
    <LegalShell titulo="Termos do Entregador Parceiro" vigencia={VIGENCIA}>
      <TermosEntregadorContent />
    </LegalShell>
  );
}
