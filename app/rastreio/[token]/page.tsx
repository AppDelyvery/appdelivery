import RastreioPublico from "@/components/rastreio/RastreioPublico";

// Público (sem auth) — cliente final acompanha pelo link. params é assíncrono no Next 16.
export default async function RastreioPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <RastreioPublico token={token} />;
}
