import { useEffect, useState } from "react";
import { colorTramo, fmt1 } from "../lib/model.js";
import { copiarTexto } from "../lib/vista.js";

const MODOS = [
  ["malla", "Según malla", "A pie, o en carro si el tramo tiene algún trayecto en transporte"],
  ["pie", "Todo a pie", "Abrir todos los tramos caminando"],
  ["carro", "Todo en carro", "Abrir todos los tramos en carro, con tráfico en vivo"],
];

export default function TramosPanel({ tramos, modo, onModo, onFoco, titulo }) {
  const [msg, setMsg] = useState("");
  const [mostrarTexto, setMostrarTexto] = useState(false);
  const texto = `${titulo}\n${tramos.map((t) => `Tramo ${t.n + 1} (paradas ${t.desde}-${t.hasta}, ${t.carro ? "carro" : "a pie"}): ${t.url}`).join("\n")}`;

  useEffect(() => { setMsg(""); setMostrarTexto(false); }, [titulo, modo]);

  const copiar = async () => {
    if (await copiarTexto(texto)) setMsg("Links copiados.");
    else { setMostrarTexto(true); setMsg("Selecciona y copia el texto."); }
  };

  return (
    <section className="card a-tramos" aria-labelledby="hTr">
      <h2 id="hTr">Abrir en Google Maps <small>{tramos.length} tramo{tramos.length !== 1 ? "s" : ""}</small></h2>
      <div className="mode" role="group" aria-label="Modo de viaje en Google Maps">
        {MODOS.map(([k, l, t]) => (
          <button key={k} id={`m-${k}`} type="button" title={t} aria-pressed={modo === k} onClick={() => onModo(k)}>{l}</button>
        ))}
      </div>
      <div className="tlist">
        {tramos.map((t) => (
          <a key={t.n} id={`t-${t.n}`} className="tramo" href={t.url} target="_blank" rel="noopener noreferrer" style={{ "--tc": colorTramo(t.n) }}
            onMouseEnter={() => onFoco(t.n)} onMouseLeave={() => onFoco(null)} onFocus={() => onFoco(t.n)} onBlur={() => onFoco(null)}>
            <span className="sw" />
            <span style={{ minWidth: 0 }}>
              <div className="tt">Tramo {t.n + 1} · paradas {t.desde} a {t.hasta}</div>
              <div className="ts num">
                {t.carro ? "En carro" : "A pie"} · {t.idx.length} puntos · {fmt1.format(t.km)} km{t.nT ? ` · ${t.nT} en transporte` : ""}
                {t.fuera > 0 && <> · <span className="wr">{t.fuera} coord. fuera de perímetro</span></>}
              </div>
            </span>
            <span className="go">Abrir ↗</span>
          </a>
        ))}
      </div>
      <div className="row-actions">
        <button type="button" className="btn" id="copyBtn" onClick={copiar}>Copiar links del día</button>
        <span className="hint" role="status">{msg}</span>
      </div>
      {mostrarTexto && <textarea className="copy-area" readOnly value={texto} aria-label="Links del día" onFocus={(e) => e.target.select()} autoFocus />}
      <p className="hint" style={{ margin: "10px 0 0" }}>
        Google Maps acepta hasta 10 paradas por link, por eso la ruta se parte en tramos. El modo carro muestra el tráfico en vivo. En celular, ábrelos con la app de Google Maps.
      </p>
    </section>
  );
}
