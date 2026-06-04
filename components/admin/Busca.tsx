"use client";

export default function Busca({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      className="input"
      style={{ marginBottom: 12 }}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export const norm = (s: string) => (s ?? "").toLowerCase();
