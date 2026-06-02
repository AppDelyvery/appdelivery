import EmBreve from "@/components/EmBreve";

// Público (sem auth) — cliente final acompanha pelo link. params é assíncrono no Next 16.
export default async function RastreioPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <EmBreve
      ic="pin"
      titulo="Rastreio público"
      descricao={`Tela do cliente final (token ${token.slice(0, 6)}…) entra na próxima fatia: mapa ao vivo + status, sem login.`}
    />
  );
}
