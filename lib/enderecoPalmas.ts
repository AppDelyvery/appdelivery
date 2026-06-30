// Conversão da dupla nomenclatura de Palmas-TO.
// O Mapbox só entende o sistema NUMÉRICO ("1206 Sul"), mas a população usa também
// o ARSE/ARSO/ARNE/ARNO ("ARSE 122"). Fórmula validada em 9 equivalências reais.
//
//   AR(S|N)(E|O) NNN  →  resto×100 + (2×d + lado)  {Norte|Sul}
//   resto = número sem o último dígito · d = último dígito
//   lado = E(leste/par)→2 · O(oeste/ímpar)→1 ;  S→Sul · N→Norte
//
//   ARSE 122 → 12·100 + (2·2 + 2) = 1206 Sul
//   ARSE 131 → 13·100 + (2·1 + 2) = 1304 Sul

const RX = /\b(a[rc])\s*([sn])\s*([eo])\s*0*(\d{2,})\b/i;

// Converte "ARSE 122" → "Quadra 1206 Sul, Palmas - TO". null se não for esse padrão.
export function arseParaNumerico(texto: string): string | null {
  const m = texto.match(RX);
  if (!m) return null;
  const band = m[2].toUpperCase() === "S" ? "Sul" : "Norte";
  const lado = m[3].toUpperCase() === "E" ? 2 : 1;
  const n = m[4];
  const resto = parseInt(n.slice(0, -1), 10);
  const d = parseInt(n.slice(-1), 10);
  if (!Number.isFinite(resto) || !Number.isFinite(d)) return null;
  const novo = resto * 100 + (2 * d + lado);
  return `Quadra ${novo} ${band}, Palmas - TO`;
}

// Query pronta pro geocoder. Converte SÓ o token ARSE pra forma numérica e
// PRESERVA o complemento (alameda, lote, etc.) — sem isso o Mapbox recebia só
// "Quadra 1206 Sul" e devolvia alamedas aleatórias da quadra.
export function queryGeocoder(texto: string): string {
  const m = texto.match(RX);
  if (!m) return texto;
  const band = m[2].toUpperCase() === "S" ? "Sul" : "Norte";
  const lado = m[3].toUpperCase() === "E" ? 2 : 1;
  const n = m[4];
  const resto = parseInt(n.slice(0, -1), 10);
  const d = parseInt(n.slice(-1), 10);
  if (!Number.isFinite(resto) || !Number.isFinite(d)) return texto;
  const novo = resto * 100 + (2 * d + lado);
  const convertido = texto.replace(RX, `Quadra ${novo} ${band}`);
  return /palmas/i.test(convertido) ? convertido : `${convertido}, Palmas - TO`;
}
