import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, ScaleControl, TileLayer, useMap } from "react-leaflet";
import { ALERTA, colorTramo, coord } from "../lib/model.js";
import { useColoresTema } from "../lib/tema.js";

// Mapa base. Se puede cambiar en Vercel con las variables VITE_MAPA_TILES y VITE_MAPA_ATRIBUCION.
const TILES = import.meta.env.VITE_MAPA_TILES || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATRIBUCION = import.meta.env.VITE_MAPA_ATRIBUCION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Encuadra la ruta del día. Si la persona no ha movido el mapa, lo vuelve a encuadrar cuando cambia el tamaño.
function Encuadre({ bounds, clave }) {
  const map = useMap();
  const movido = useRef(false);
  const prog = useRef(false);
  const ref = useRef(bounds);
  ref.current = bounds;

  const encuadrar = () => {
    if (!ref.current) return;
    prog.current = true;
    map.fitBounds(ref.current, { padding: [40, 40], maxZoom: 16, animate: false });
    prog.current = false;
  };

  useEffect(() => {
    const drag = () => { movido.current = true; };
    const zoom = () => { if (!prog.current) movido.current = true; };
    map.on("dragstart", drag);
    map.on("zoomstart", zoom);
    const ro = new ResizeObserver(() => { map.invalidateSize({ pan: false }); if (!movido.current) encuadrar(); });
    ro.observe(map.getContainer());
    return () => { map.off("dragstart", drag); map.off("zoomstart", zoom); ro.disconnect(); };
  }, [map]);

  useEffect(() => { movido.current = false; encuadrar(); }, [clave]);
  return null;
}

// Centra el mapa en una parada y abre su ficha (clic en el itinerario).
function IrAParada({ irA, refs }) {
  const map = useMap();
  useEffect(() => {
    if (!irA) return;
    const m = refs.current[irA.i];
    if (!m) return;
    map.setView(m.getLatLng(), Math.max(map.getZoom(), 16), { animate: true });
    m.openPopup();
  }, [irA]);
  return null;
}

function Ficha({ data, s, tramo }) {
  const p = s.p;
  return (
    <div className="pp">
      <div className="m">Parada {s.seq} · tramo {tramo + 1} · llega {s.hora}</div>
      <b>{p[0]}</b>
      <div className="m">SAP {s.sap} · {data.barrios[p[1]] || "Sin barrio"} · {data.ciudades[p[2]]}</div>
      <div className="m">{data.canales[p[5]] || "Sin canal"} · Tier {p[3] || "—"} · {data.fdvs[p[4]]} · visita {s.minVis} min</div>
      {p[12].length > 0 && (
        <div className="al">
          {p[12].map((a, i) => <div key={i}><span className={`code ${a[0]}`} title={ALERTA[a[0]]}>{a[0]}</span> {a[1]}</div>)}
        </div>
      )}
      <div style={{ marginTop: 6 }}>
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coord(p))}`} target="_blank" rel="noopener noreferrer">Ver punto en Google Maps ↗</a>
      </div>
    </div>
  );
}

export default function RouteMap({ data, u, est, tramos, tOf, hover, foco, territorio, irA, onHover, claveDia }) {
  const colores = useColoresTema();
  const canvas = useMemo(() => L.canvas({ padding: 0.3 }), []);
  const refs = useRef([]);
  const stops = est.stops;

  const puntosRuta = useMemo(() => Object.values(data.pdv).filter((p) => p[8] === u), [data, u]);
  const bounds = useMemo(() => (stops.length ? L.latLngBounds(stops.map((s) => [s.p[6], s.p[7]])) : null), [stops]);

  const iconos = useMemo(() => stops.map((s, i) => {
    const cls = `stop${i === 0 ? " first" : ""}${i === stops.length - 1 ? " last" : ""}`;
    const malo = s.p[10] || s.p[12].some((a) => a[0] === "A1");
    return L.divIcon({
      className: "",
      html: `<div class="${cls}" style="--tc:${colorTramo(tOf[i] || 0)}">${s.seq}${malo ? '<span class="bd"></span>' : ""}</div>`,
      iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -14],
    });
  }), [stops, tOf]);

  // Resaltado de parada y de tramo sin volver a crear los marcadores
  useEffect(() => {
    const enTramo = foco === null ? null : new Set(tramos[foco]?.idx || []);
    refs.current.forEach((m, i) => {
      const el = m?.getElement()?.firstChild;
      if (!el) return;
      el.classList.toggle("hl", hover === i);
      el.classList.toggle("dim", !!enTramo && !enTramo.has(i));
      m.setZIndexOffset(hover === i ? 1000 : 0);
    });
  }, [hover, foco, tramos, iconos]);

  const colorLeg = (t) => colores.tramos[t % colores.tramos.length];

  return (
    <MapContainer className="map" center={[4.65, -74.08]} zoom={12} zoomSnap={0.25} scrollWheelZoom>
      <TileLayer url={TILES} attribution={ATRIBUCION} maxZoom={19} />
      <ScaleControl position="bottomleft" imperial={false} />
      {territorio && puntosRuta.map((p, i) => (
        <CircleMarker key={`t${u}-${i}`} center={[p[6], p[7]]} radius={3} renderer={canvas} interactive={false}
          pathOptions={{ stroke: true, color: colores.panel, weight: 0.8, fillColor: colores.territorio, fillOpacity: 0.85 }} />
      ))}
      {stops.slice(1).map((s, k) => {
        const i = k + 1, a = stops[i - 1].p, b = s.p, t = tOf[i] || 0;
        const activo = foco === null || foco === t;
        return (
          <Polyline key={`${claveDia}-l${i}`} positions={[[a[6], a[7]], [b[6], b[7]]]} interactive={false}
            pathOptions={{ color: colorLeg(t), weight: foco === t ? 5 : 3.5, opacity: activo ? 0.95 : 0.2, dashArray: s.transp ? "8 7" : null }} />
        );
      })}
      {stops.map((s, i) => (
        <Marker key={`${claveDia}-m${i}`} position={[s.p[6], s.p[7]]} icon={iconos[i]} title={`${s.seq}. ${s.p[0]}`} riseOnHover
          ref={(m) => { refs.current[i] = m; }}
          eventHandlers={{ mouseover: () => onHover(i), mouseout: () => onHover(null) }}>
          <Popup maxWidth={280}><Ficha data={data} s={s} tramo={tOf[i] || 0} /></Popup>
        </Marker>
      ))}
      <Encuadre bounds={bounds} clave={claveDia} />
      <IrAParada irA={irA} refs={refs} />
    </MapContainer>
  );
}
