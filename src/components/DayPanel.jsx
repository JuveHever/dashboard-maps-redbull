import { JORNADA_MIN, fmt0, fmt1, hm, reloj } from "../lib/model.js";

function Kpi({ l, v, s }) {
  return (
    <div className="kpi">
      <div className="l">{l}</div>
      <div className="v num">{v}</div>
      {s && <div className="s">{s}</div>}
    </div>
  );
}

export default function DayPanel({ est, tramos, etiqueta }) {
  const n = est.stops.length;
  const largo = est.finReal > JORNADA_MIN;
  return (
    <section className="card a-day" aria-labelledby="hDay">
      <h2 id="hDay">Jornada <small>{etiqueta}</small></h2>
      <div className="kpis">
        <Kpi l="Paradas" v={String(n)} s={`Tramos en Maps: ${tramos.length}`} />
        <Kpi l="Jornada según malla" v={`${est.inicio} – ${reloj(est.inicio, est.fin)}`} s={hm(est.fin)} />
        <Kpi l="Recorrido" v={`${fmt1.format(est.km)} km`} s={est.nT ? `${est.nT} trayecto${est.nT > 1 ? "s" : ""} en transporte` : "Todo a pie"} />
        <Kpi l="Visitas" v={`${fmt0.format(est.vis)} min`} s={`Promedio ${fmt1.format(est.vis / Math.max(n, 1))} min por PDV`} />
      </div>
      <div className={`callout${largo ? " warn" : ""}`}>
        <b className="num">Con tiempos a pie del archivo: fin {reloj(est.inicio, est.finReal)} ({hm(est.finReal)})</b>
        <span>
          La malla calcula {fmt0.format(est.plan)} min de desplazamiento a unos 22 km/h, también en los tramos a pie. Con la columna Min_pie serían {fmt0.format(est.real)} min.
        </span>
      </div>
    </section>
  );
}
