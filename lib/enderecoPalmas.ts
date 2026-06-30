// Endereços de Palmas-TO no geocoder do Mapbox.
//
// Descoberta empírica (30/06/2026, testado contra a API real): o Mapbox ENTENDE
// o formato ARSE/ARSO/ARNE/ARNO cru — "ARSE 122, Alameda 9" → "Alameda 09 122" —
// e ENGASGA no formato numérico "Quadra 1206 Sul" (devolve só "Palmas, Tocantins").
// Por isso NÃO convertemos nada: passamos o texto como o usuário digitou, só
// garantindo o contexto de cidade/UF quando ele não escreveu, pra ancorar a busca.
// (A proximidade + bbox da chamada já enviesam pra região de Palmas.)

export function queryGeocoder(texto: string): string {
  const t = texto.trim();
  if (!t) return t;
  return /palmas|tocantins/i.test(t) ? t : `${t}, Palmas - TO`;
}
