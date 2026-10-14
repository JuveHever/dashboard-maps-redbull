import { useEffect, useMemo, useRef, useState } from "react";
import { DIA_NOMBRE, construirTramos, estadisticasDia, fmt0, indexarDias, nombreCorto, resumenRuta, tramoDeParada } from "./lib/model.js";
import { copiarTexto, escribirVista, leerVista } from "./lib/vista.js";
import MonthMatrix from "./components/MonthMatrix.jsx";
import DayPanel from "./components/DayPanel.jsx";
import TramosPanel from "./components/TramosPanel.jsx";
import AlertsPanel from "./components/AlertsPanel.jsx";
import RouteMap from "./components/RouteMap.jsx";
import Itinerary from "./components/Itinerary.jsx";

const MODOS = ["malla", "pie", "carro"];

function primerDia(dayIdx, data, u) {
  for (const w of data.semanas) for (let d = 0; d < data.dias.length; d++) if (dayIdx[`${u}|${w}|${d}`]) return { w, d };
  return { w: data.semanas[0], d: 0 };
}

export default function App() {
  const inicial = useRef(leerVista());
  const [indice, setIndice] = useState(null);
  const [slug, setSlug] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sel, setSel] = useState(null); // { u, w, d }
  const [modo, setModo] = useState(MODOS.includes(inicial.current.modo) ? inicial.current.modo : "malla");
  const [hover, setHover] = useState(null);
  const [foco, setFoco] = useState(null);
  const [territorio, setTerritorio] = useState(true);
  const [irA, setIrA] = useState(null);
  const [msgLink, setMsgLink] = useState("");

  // Índice de mallas
  useEffect(() => {
    let vivo = true;
    fetch("/data/index.json")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((ix) => {
        if (!vivo) return;
        setIndice(ix.mallas);
        const pedida = ix.mallas.find((m) => m.slug === inicial.current.malla);
        setSlug((pedida || ix.mallas[0]).slug);
      })
      .catch((e) => vivo && setError(`No se pudo cargar el listado de mallas (${e.message}).`));
    return () => { vivo = false; };
  }, []);

  // Malla seleccionada
  useEffect(() => {
    if (!slug) return;
    let vivo = true;
    setData(null);
    fetch(`/data/${slug}.json`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => {
        if (!vivo) return;
        const idx = indexarDias(d);
        const v = inicial.current;
        let s = null;
        if (v.ruta && v.malla === slug) {
          const u = d.users.findIndex((x) => x.id.toUpperCase() === v.ruta.toUpperCase());
          if (u >= 0) {
            const di = d.dias.indexOf(v.dia);
            s = v.semana && di >= 0 && idx[`${u}|${v.semana}|${di}`] ? { u, w: v.semana, d: di } : { u, ...primerDia(idx, d, u) };
          }
        }
        inicial.current = {};
        setData(d);
        setSel(s || { u: 0, ...primerDia(idx, d, 0) });
      })
      .catch((e) => vivo && setError(`No se pudo cargar la malla (${e.message}).`));
    return () => { vivo = false; };
  }, [slug]);

  const dayIdx = useMemo(() => (data ? indexarDias(data) : {}), [data]);
  const day = data && sel ? dayIdx[`${sel.u}|${sel.w}|${sel.d}`] : null;
  const est = useMemo(() => (day ? estadisticasDia(data, day) : null), [data, day]);
  const tramos = useMemo(() => (est ? construirTramos(est.stops, modo) : []), [est, modo]);
  const tOf = useMemo(() => (est ? tramoDeParada(est.stops, tramos) : []), [est, tramos]);
  const resumen = useMemo(() => (data && sel ? resumenRuta(data, sel.u) : null), [data, sel?.u]);

  useEffect(() => { setHover(null); setFoco(null); }, [day]);
  useEffect(() => {
    if (!data || !sel) return;
    escribirVista({ malla: slug, ruta: data.users[sel.u].id, semana: sel.w, dia: data.dias[sel.d], modo });
    setMsgLink("");
  }, [data, sel, modo, slug]);

  if (error) return <div className="state"><div><b>Algo falló</b>{error}</div></div>;
  if (!data || !sel || !day) return <div className="state"><div><b>Cargando malla…</b>Un momento.</div></div>;

  const malla = indice.find((m) => m.slug === slug);
  const user = data.users[sel.u];
  const etiqueta = `Semana ${sel.w} · ${DIA_NOMBRE[data.dias[sel.d]]}`;

  const elegirRuta = (u) => {
    const mismo = dayIdx[`${u}|${sel.w}|${sel.d}`];
    setSel(mismo ? { u, w: sel.w, d: sel.d } : { u, ...primerDia(dayIdx, data, u) });
  };
  const copiarVista = async () => {
    const ok = await copiarTexto(window.location.href);
    setMsgLink(ok ? "Link copiado" : window.location.href);
  };

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <div className="eyebrow">Activación de marca · Malla mensual</div>
          <h1>{malla.nombre}</h1>
        </div>
        <div className="top-side">
          <p className="src">
            {malla.archivo} · {data.users.length} rutas · {fmt0.format(malla.pdv)} PDV · {fmt0.format(malla.visitas)} visitas al mes
          </p>
          <div className="top-actions">
            {indice.length > 1 && (
              <select className="select" id="malla" aria-label="Malla" value={slug} onChange={(e) => setSlug(e.target.value)}>
                {indice.map((m) => <option key={m.slug} value={m.slug}>{m.nombre}</option>)}
              </select>
            )}
            <button type="button" className="btn" id="copiarVista" onClick={copiarVista}>Copiar link de esta vista</button>
            {msgLink && <span className="hint" role="status" style={{ overflowWrap: "anywhere" }}>{msgLink}</span>}
          </div>
        </div>
      </header>

      <nav className="users" aria-label="Ruta - usuario">
        {data.users.map((u, i) => (
          <button key={u.id} id={`u-${i}`} type="button" className="ubtn" aria-pressed={i === sel.u} onClick={() => elegirRuta(i)}>
            <b>{nombreCorto(u.id)}</b>
            <span>{u.cedi}</span>
          </button>
        ))}
      </nav>

      <main className="grid">
        <MonthMatrix data={data} dayIdx={dayIdx} sel={sel} user={user} resumen={resumen} onSelect={(w, d) => setSel({ u: sel.u, w, d })} />
        <DayPanel est={est} tramos={tramos} etiqueta={etiqueta} />
        <TramosPanel tramos={tramos} modo={modo} onModo={setModo} onFoco={setFoco} titulo={`${user.id} · ${etiqueta}`} />
        <AlertsPanel day={day} est={est} />
        <section className="card a-map" aria-label="Mapa de la ruta">
          <div className="maphead">
            <div>
              <div className="t">{nombreCorto(user.id)} · {etiqueta}</div>
              <div className="s num">{est.stops.length} paradas · {est.km.toFixed(1).replace(".", ",")} km · patrón {est.stops[0]?.p[9]}</div>
              <div className="s">Líneas rectas entre paradas. La ruta por calles y el tráfico en vivo, en los botones de Google Maps.</div>
            </div>
            <div className="mkey">
              <span><span className="ln" />A pie</span>
              <span><span className="ln d" />Transporte</span>
              <label className="chk"><input type="checkbox" id="terr" checked={territorio} onChange={(e) => setTerritorio(e.target.checked)} /> <span className="dt" />Resto del territorio</label>
            </div>
          </div>
          <RouteMap data={data} u={sel.u} est={est} tramos={tramos} tOf={tOf} hover={hover} foco={foco} territorio={territorio} irA={irA} onHover={setHover} claveDia={`${slug}|${sel.u}|${sel.w}|${sel.d}`} />
        </section>
        <Itinerary data={data} est={est} tOf={tOf} hover={hover} onHover={setHover} onIr={(i) => setIrA({ i, n: Date.now() })} titulo={`${nombreCorto(user.id)} · ${etiqueta}`} />
      </main>
    </div>
  );
}
