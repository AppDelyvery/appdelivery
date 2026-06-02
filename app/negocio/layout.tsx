import { EntregaProvider } from "@/components/negocio/EntregaContext";

export default function NegocioLayout({ children }: { children: React.ReactNode }) {
  return <EntregaProvider>{children}</EntregaProvider>;
}
