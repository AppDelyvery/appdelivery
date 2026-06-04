// Exporta linhas pra CSV e dispara o download no browser. Sem dependência.
// Escapa aspas/quebras conforme RFC 4180; BOM UTF-8 pro Excel ler acento.

function celula(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function baixarCSV(nomeArquivo: string, colunas: { chave: string; titulo: string }[], linhas: Record<string, unknown>[]) {
  const head = colunas.map((c) => celula(c.titulo)).join(",");
  const body = linhas.map((l) => colunas.map((c) => celula(l[c.chave])).join(",")).join("\n");
  const csv = "﻿" + head + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
