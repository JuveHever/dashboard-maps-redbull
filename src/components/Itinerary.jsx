import { ALERTA, colorTramo, fmt0, fmt1 } from "../lib/model.js";

export default function Itinerary({ data, est, tOf, hover, onHover, onIr, titulo }) {
  return (
    <section className="card a-table" aria-labelledby="hTbl">
      <h2 id="hTbl">Itinerario <small>{titulo}</small></h2>
      <div className="tblwrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Llega</th><th>Punto de venta</th><th>Barrio</th><th>Canal · Tier</th>
              <th className="r">Visita</th><th className="r">Desde anterior</th><th className="r">Min a pie*</th><th>Modo</th><th>Alertas</th>
            </tr>
          </thead>
          <tbody id="tbody">
            {est.stops.map((s, i) => {
              const ciudad = data.ciudades[s.p[2]] || "";
              return (
                <tr key={`${s.sap}-${i}`} className={hover === i ? "hl" : undefined} style={{ "--tc": colorTramo(tOf[i] || 0) }}
                  onMouseEnter={() => onHover(i)} onMouseLeave={() => onHover(null)} onClick={() => onIr(i)}>
                  <td><span className="sq">{s.seq}</span></td>
                  <td className="num">{s.hora}</td>
                  <td><div className="pn">{s.p[0]}</div><div className="sap num">SAP {s.sap}</div></td>
                  <td>{data.barrios[s.p[1]] || "—"}{ciudad && ciudad.toUpperCase() !== "BOGOTA" ? ` · ${ciudad}` : ""}</td>
                  <td>{data.canales[s.p[5]] || "—"} · {s.p[3] || "—"}</td>
                  <td className="r num">{s.minVis} min</td>
                  <td className="r num">{i === 0 ? "Inicio" : `${fmt1.format(s.km)} km · ${fmt1.format(s.minPlan)} min`}</td>
                  <td className="r num">{i === 0 ? "—" : fmt0.format(s.transp ? s.minCarro : s.minPie)}</td>
                  <td><span className={`pill${s.transp ? " tr" : ""}`}>{i === 0 ? "—" : s.transp ? "Transporte" : "A pie"}</span></td>
                  <td>{s.p[12].map((a, j) => <span key={j} className={`code ${a[0]}`} title={ALERTA[a[0]]} style={{ marginRight: 4 }}>{a[0]}</span>)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="foot">
        <span>Desde anterior: km por vía estimada y minutos usados en la malla.</span>
        <span>*Min a pie: columna Min_pie del archivo (Min_carro en trayectos de transporte), para comparar.</span>
        <span>Clic en una fila para ubicarla en el mapa.</span>
      </div>
    </section>
  );
}
