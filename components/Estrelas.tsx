// Estrelas em SVG (sem glifo unicode — regra zero-emoji do projeto).
// Âmbar cheio até a nota, cinza no resto. Compartilhado por admin/negócio/entregador.
export function Estrelas({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= n ? "#f59e0b" : "var(--line-2)"} aria-hidden>
          <polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9" />
        </svg>
      ))}
    </span>
  );
}

// cor por sentimento da nota — verde (bom), âmbar (neutro), vermelho (ruim)
export const corNota = (n: number) => (n >= 4 ? "var(--go)" : n === 3 ? "#f59e0b" : "var(--warn)");
