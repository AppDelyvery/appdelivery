import AdminShell from "./AdminShell";

export default function EmConstrucao({ title, msg }: { title: string; msg: string }) {
  return (
    <AdminShell title={title}>
      <div className="card">
        <div style={{ padding: "28px 12px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>{msg}</div>
      </div>
    </AdminShell>
  );
}
