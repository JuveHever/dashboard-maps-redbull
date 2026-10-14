import { ALERTA, DIA_ABR, DIA_NOMBRE, estadisticasDia, fmt0, reloj } from "../lib/model.js";

export default function MonthMatrix({ data, dayIdx, sel, user, resumen, onSelect }) {
  const notas = [];
  if (resumen.a5) notas.push(`${resumen.a5} días con visita comprimida`);
  if (resumen.a1) notas.push(`${resumen.a1} PDV con coordenada fuera de perímetro`);
  (user.notas || []).forEach((n) => notas.push(`${n[0]} ${ALERTA[n[0]]?.toLowerCase() || ""}`));

  return (
    <section className="card a-month" aria-labelledby="hMonth">
      <h2 id="hMonth">Mes <small>Semana × día</small></h2>
      <div className="uid">{user.id}</div>
      <div className="usum">
        {[["Región", user.region], ["Ciudades", user.ciudades.join(", ")], ["PDV", fmt0.format(resumen.pdv)], ["Visitas/mes", fmt0.format(resumen.visitas)], ["Km/mes", fmt0.format(resumen.km)]].map(([l, v]) => (
          <span key={l}>{l} <b className="num">{v}</b></span>
        ))}
        {notas.length > 0 && <span className="notes">{notas.join(" · ")}</span>}
      </div>
      <div className="mtx" role="group" aria-label="Seleccione semana y día" style={{ gridTemplateColumns: `30px repeat(${data.dias.length}, minmax(0, 1fr))` }}>
        <div />
        {data.dias.map((d) => <div key={d} className="hd">{DIA_ABR[d]}</div>)}
        {data.semanas.map((w) => [
          <div key={`w${w}`} className="wk">S{w}</div>,
          ...data.dias.map((dn, d) => {
            const day = dayIdx[`${sel.u}|${w}|${d}`];
            if (!day) return <div key={`${w}-${d}`} />;
            const st = estadisticasDia(data, day);
            const fin = reloj(st.inicio, st.fin);
            return (
              <button key={`${w}-${d}`} id={`c-${w}-${d}`} type="button" className="cell" aria-pressed={w === sel.w && d === sel.d}
                aria-label={`Semana ${w}, ${DIA_NOMBRE[dn]}: ${st.stops.length} PDV, fin ${fin}`} onClick={() => onSelect(w, d)}>
                <b className="num">{st.stops.length}</b>
                <span className="num">{fin}</span>
                {day.a.length > 0 && <i className="w" />}
                {st.a1 > 0 && <i className="x" />}
              </button>
            );
          }),
        ])}
      </div>
      <div className="legend">
        <span><i style={{ background: "var(--warn)" }} />Visita comprimida (A5)</span>
        <span><i style={{ background: "var(--bad)" }} />PDV fuera de perímetro (A1)</span>
        <span>Número: PDV · hora: fin según malla</span>
      </div>
    </section>
  );
}
