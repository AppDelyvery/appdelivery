import { EntregadorProvider } from "@/components/entregador/EntregadorContext";

export default function EntregadorLayout({ children }: { children: React.ReactNode }) {
  return <EntregadorProvider>{children}</EntregadorProvider>;
}
