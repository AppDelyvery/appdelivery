"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";
import { MAPBOX_TOKEN, hasMapbox } from "@/lib/mapbox";
import { queryGeocoder } from "@/lib/enderecoPalmas";
import MapaPinPicker, { type PontoMapa } from "./MapaPinPicker";

export type Lugar = { endereco: string; lat: number; lng: number };

// O geocoder do Mapbox resolve só até a alameda (não tem o lote/casa de Palmas no banco).
// Extrai o complemento que o usuário digitou (lote, casa, nº, apto, bloco) pra preservá-lo
// no endereço salvo — o entregador lê "lote 9" mesmo com o pino no nível da alameda.
function extrairComplemento(raw: string): string {
  const re = /\b(lote|lt|casa|cs|apto?|apartamento|bloco|bl|n[ºo°]|n[uú]mero)\.?\s*\d+[a-z]?\b/gi;
  const achados = raw.match(re);
  return achados ? achados.join(", ") : "";
}

// Junta o complemento (lote/nº/referência) ao endereço geocodado, sem duplicar.
function comporEndereco(base: Lugar, comp: string): Lugar {
  const c = comp.trim();
  const jaTem = !!c && base.endereco.toLowerCase().includes(c.toLowerCase());
  return c && !jaTem ? { ...base, endereco: `${base.endereco}, ${c}` } : base;
}

// Busca de endereço com autocomplete (Mapbox Geocoding), enviesada pra Palmas-TO.
// Devolve o lugar COM coordenadas — sem isso o pedido não tem lat/lng real.
export default function AddressAutocomplete({
  label,
  valor,
  onSelecionar,
  placeholder,
}: {
  label: string;
  valor: Lugar | null;
  onSelecionar: (l: Lugar | null) => void;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState(valor?.endereco ?? "");
  const [sugestoes, setSugestoes] = useState<Lugar[]>([]);
  const [aberto, setAberto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [picker, setPicker] = useState(false);
  const [complemento, setComplemento] = useState("");
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<Lugar | null>(null); // endereço geocodado SEM complemento (pra recompor)

  const confirmarPino = (p: PontoMapa) => {
    const base = { endereco: p.endereco, lat: p.lat, lng: p.lng };
    baseRef.current = base;
    setTexto(p.endereco);
    onSelecionar(comporEndereco(base, complemento));
    setSugestoes([]);
    setAberto(false);
    setPicker(false);
  };

  const mudarComplemento = (v: string) => {
    setComplemento(v);
    if (baseRef.current) onSelecionar(comporEndereco(baseRef.current, v));
  };

  // fecha ao clicar fora
  useEffect(() => {
    const fora = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setAberto(false); };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  // sincroniza o texto quando o valor é definido DE FORA (ex.: coleta semeada do endereço
  // do negócio depois do mount) — sem isso o campo mostra só o placeholder com coords carregadas.
  useEffect(() => {
    // só semeia quando o valor vem DE FORA (não da nossa própria escolha, que seta baseRef)
    if (valor?.endereco && !baseRef.current) setTexto(valor.endereco);
  }, [valor]);

  const buscar = (q: string) => {
    setTexto(q);
    baseRef.current = null;
    onSelecionar(null); // mudou o texto → coords ainda não confirmadas
    if (tRef.current) clearTimeout(tRef.current);
    if (!hasMapbox() || q.trim().length < 3) { setSugestoes([]); setAberto(false); return; }
    setBuscando(true);
    tRef.current = setTimeout(async () => {
      // texto cru + contexto Palmas (o Mapbox entende "ARSE 122" nativamente; ver enderecoPalmas).
      // bbox cobre a região: Palmas + Taquaralto/Aurenys + Luzimangues + Porto Nacional.
      // Gurupi (230 km) e além ficam por conta do "marcar no mapa" (pino); o lote vai no complemento.
      const alvo = queryGeocoder(q);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(alvo)}.json` +
        `?access_token=${MAPBOX_TOKEN}&country=br&language=pt&limit=6&autocomplete=true` +
        `&proximity=-48.3336,-10.1844&bbox=-48.75,-10.85,-48.10,-9.80`;
      try {
        const d = await (await fetch(url)).json();
        const sug: Lugar[] = (d.features || []).map((f: { place_name: string; center: [number, number] }) => ({
          endereco: f.place_name, lng: f.center[0], lat: f.center[1],
        }));
        setSugestoes(sug);
        setAberto(true);
      } catch {
        setSugestoes([]);
      } finally {
        setBuscando(false);
      }
    }, 350);
  };

  const escolher = (l: Lugar) => {
    baseRef.current = l;
    // se o usuário já digitou lote/nº na busca, leva pro campo de complemento
    const comp = complemento || extrairComplemento(texto);
    if (comp !== complemento) setComplemento(comp);
    setTexto(l.endereco);
    onSelecionar(comporEndereco(l, comp));
    setSugestoes([]);
    setAberto(false);
  };

  return (
    <div className="field" style={{ position: "relative" }} ref={boxRef}>
      <label>{label}</label>
      <div className="with-icon">
        <Icon name="pin" />
        <input
          className="input"
          value={texto}
          placeholder={placeholder ?? "Digite o endereço…"}
          autoComplete="off"
          onChange={(e) => buscar(e.target.value)}
          onFocus={() => sugestoes.length > 0 && setAberto(true)}
        />
      </div>
      {aberto && sugestoes.length > 0 && (
        <div className="ac-list">
          {sugestoes.map((s, i) => (
            <button key={i} type="button" className="ac-item" onClick={() => escolher(s)}>
              <Icon name="pin" />
              <span>{s.endereco}</span>
            </button>
          ))}
        </div>
      )}
      <input
        className="input"
        style={{ marginTop: 7 }}
        value={complemento}
        placeholder="Lote, nº, quadra/bloco/apto e ponto de referência"
        autoComplete="off"
        onChange={(e) => mudarComplemento(e.target.value)}
      />
      <div className="ac-hint" style={{ marginTop: 4 }}>Em Palmas o lote faz parte do endereço — informe aqui.</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5, gap: 8 }}>
        {valor ? (
          <div className="ac-ok"><Icon name="checkThin" /> Endereço localizado</div>
        ) : texto.trim().length >= 3 ? (
          <div className="ac-hint">{buscando ? "Buscando…" : "Selecione na lista, ou marque no mapa."}</div>
        ) : <span />}
        <button type="button" className="ac-pin-btn" onClick={() => setPicker(true)}><Icon name="pin" /> Marcar no mapa</button>
      </div>
      {picker && (
        <MapaPinPicker
          inicial={valor ? { lat: valor.lat, lng: valor.lng } : null}
          onConfirmar={confirmarPino}
          onFechar={() => setPicker(false)}
        />
      )}
    </div>
  );
}
