// Lógica de la malla: estadísticas del día, tramos de Google Maps y formatos.

export const DIA_NOMBRE = { LUNES: "Lunes", MARTES: "Martes", MIERCOLES: "Miércoles", JUEVES: "Jueves", VIERNES: "Viernes", SABADO: "Sábado", DOMINGO: "Domingo" };
export const DIA_ABR = { LUNES: "Lun", MARTES: "Mar", MIERCOLES: "Mié", JUEVES: "Jue", VIERNES: "Vie", SABADO: "Sáb", DOMINGO: "Dom" };
export const ALERTA = {
  A1: "Coordenada fuera de perímetro",
  A2: "Coordenada invertida corregida",
  A3: "Coordenada compartida",
  A4: "TIER asumido",
  A5: "Visita comprimida",
  PIE: "Jornada larga a pie",
};
export const MAX_PUNTOS = 10; // Google Maps: origen + 8 paradas intermedias + destino
export const N_COLORES = 6;
export const JORNADA_MIN = 8 * 60;

export const fmt1 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
export const fmt0 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

export function nombreCorto(id) {
  const m = /\.([A-Z]+)(\d+)$/.exec(id);
  if (!m) return id;
  const c = m[1] === "BOGOTA" ? "Bogotá" : m[1] === "MEDELLIN" ? "Medellín" : m[1].charAt(0) + m[1].slice(1).toLowerCase();
  return `${c} ${m[2]}`;
}

export function hm(min) {
  const t = Math.floor(min + 1e-6);
  return `${Math.floor(t / 60)} h ${String(t % 60).padStart(2, "0")}`;
}

// Igual que la malla: la hora se trunca al minuto.
export function reloj(inicio, mas) {
  const [h, m] = inicio.split(":").map(Number);
  const t = Math.floor(h * 60 + m + mas + 1e-6);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export const coord = (p) => `${p[6].toFixed(6)},${p[7].toFixed(6)}`;
export const colorTramo = (n) => `var(--t${(n % N_COLORES) + 1})`;

export function indexarDias(data) {
  const idx = {};
  data.days.forEach((d) => { idx[`${d.u}|${d.w}|${d.d}`] = d; });
  return idx;
}

export function paradas(data, day) {
  return day.s.map((s) => ({
    sap: s[0], seq: s[1], hora: s[2], minVis: s[3], km: s[4], minPlan: s[5], minPie: s[6], minCarro: s[7], transp: s[8], acum: s[9],
    p: data.pdv[s[0]],
  }));
}

export function estadisticasDia(data, day) {
  const st = paradas(data, day);
  let km = 0, plan = 0, real = 0, vis = 0, a1 = 0, nT = 0;
  st.forEach((s, i) => {
    vis += s.minVis;
    if (i > 0) {
      km += s.km;
      plan += s.minPlan;
      real += s.transp ? s.minCarro : s.minPie;
      if (s.transp) nT++;
    }
    if (s.p[10]) a1++;
  });
  const inicio = st.length ? st[0].hora : "08:00";
  const fin = st.length ? st[st.length - 1].acum : 0;
  return { stops: st, inicio, km, plan, real, vis, fin, finReal: vis + real, a1, nT };
}

// Tramos de hasta MAX_PUNTOS puntos; cada tramo empieza en la última parada del anterior.
// modo "malla": en carro si el tramo tiene algún trayecto marcado como Transporte.
export function construirTramos(st, modo) {
  const out = [];
  let cur = [0];
  for (let i = 1; i < st.length; i++) {
    if (cur.length === MAX_PUNTOS) { out.push({ idx: cur }); cur = [i - 1]; }
    cur.push(i);
  }
  if (cur.length > 1) out.push({ idx: cur });
  return out.map((t, n) => {
    const pts = t.idx.map((i) => st[i]);
    const nT = pts.slice(1).filter((s) => s.transp).length;
    const carro = modo === "malla" ? nT > 0 : modo === "carro";
    const q = new URLSearchParams({ api: "1", origin: coord(pts[0].p), destination: coord(pts[pts.length - 1].p) });
    if (pts.length > 2) q.set("waypoints", pts.slice(1, -1).map((s) => coord(s.p)).join("|"));
    q.set("travelmode", carro ? "driving" : "walking");
    return {
      n, idx: t.idx, nT, carro,
      desde: pts[0].seq, hasta: pts[pts.length - 1].seq,
      km: pts.slice(1).reduce((a, s) => a + s.km, 0),
      fuera: pts.filter((s) => s.p[10]).length,
      url: `https://www.google.com/maps/dir/?${q.toString()}`,
    };
  });
}

// Tramo al que pertenece cada parada (la parada de empalme queda en el tramo anterior).
export function tramoDeParada(st, tramos) {
  const t = st.map(() => 0);
  tramos.forEach((tr) => tr.idx.forEach((i, j) => { if (j > 0 || tr.n === 0) t[i] = tr.n; }));
  return t;
}

export function resumenRuta(data, u) {
  let pdv = 0, a1 = 0, visitas = 0, km = 0, a5 = 0;
  Object.values(data.pdv).forEach((p) => { if (p[8] === u) { pdv++; if (p[10]) a1++; } });
  data.days.forEach((d) => {
    if (d.u !== u) return;
    visitas += d.s.length;
    d.s.forEach((s) => { km += s[4]; });
    if (d.a.length) a5++;
  });
  return { pdv, a1, visitas, km, a5 };
}
