import { ALERTA, JORNADA_MIN } from "../lib/model.js";

export default function AlertsPanel({ day, est }) {
  const items = [];
  day.a.forEach((a, i) => items.push({ k: `d${i}`, code: a[0], text: `${a[1]}.` }));
  const porCodigo = {};
  est.stops.forEach((s) => s.p[12].forEach((a) => { (porCodigo[a[0]] ||= []).push(s); }));
  Object.keys(porCodigo).sort().forEach((c) => {
    const ss = porCodigo[c];
    items.push({
      k: c, code: c,
      text: ss.length === 1
        ? `${ALERTA[c]}: parada ${ss[0].seq} · ${ss[0].p[0]}.`
        : `${ALERTA[c]} en ${ss.length} paradas: ${ss.map((s) => s.seq).join(", ")}. Detalle en el itinerario.`,
    });
  });
  if (est.finReal > JORNADA_MIN) items.push({ k: "pie", code: "PIE", text: "Con tiempos a pie la jornada pasa de 8 horas." });

  return (
    <section className="card a-alerts" aria-labelledby="hAl">
      <h2 id="hAl">Alertas del día</h2>
      <ul className="alist">
        {items.length === 0 && <li className="empty">Sin alertas para este día.</li>}
        {items.map((it) => (
          <li key={it.k}><span className={`code ${it.code}`}>{it.code}</span><span>{it.text}</span></li>
        ))}
      </ul>
    </section>
  );
}
