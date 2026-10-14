// Convierte cada Excel de /mallas en un JSON que lee la página (public/data).
// Se ejecuta solo en `npm run dev` y `npm run build`, así que en Vercel basta con
// subir el Excel nuevo a /mallas y volver a desplegar.
import { readdir, mkdir, writeFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MALLAS = path.join(ROOT, "mallas");
const OUT = path.join(ROOT, "public", "data");

const DIAS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];

const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

// Columnas de DETALLE_MALLA. La clave es el nombre que usa el script; los valores,
// los encabezados aceptados (sin tildes, en mayúscula).
const COLS = {
  ruta: ["RUTA - USUARIO", "RUTA-USUARIO", "RUTA USUARIO", "RUTA"],
  semana: ["SEMANA"],
  dia: ["DIA"],
  patron: ["PATRON"],
  secuencia: ["SECUENCIA"],
  sap: ["CODIGO SAP"],
  pdv: ["PUNTO DE VENTA"],
  region: ["REGION"],
  cedi: ["CEDI"],
  ciudad: ["CIUDAD"],
  barrio: ["BARRIO"],
  tier: ["TIER"],
  fdv: ["FDV"],
  canal: ["CANAL RED BULL", "CANAL"],
  lat: ["LATITUD", "LAT"],
  lng: ["LONGITUD", "LON", "LNG"],
  minVis: ["MIN VIS"],
  km: ["KM_VIA_EST_ANT"],
  minPlan: ["MIN_DESPLAZ_ANT"],
  minCarro: ["MIN_CARRO"],
  minPie: ["MIN_PIE"],
  transporte: ["TIPO TRANSPORTE"],
  hora: ["HORA_LLEGADA"],
  acumFin: ["MIN_ACUM_FIN"],
  fueraPerim: ["COORD_FUERA_PERIMETRO"],
  invertida: ["COORD_INVERTIDA"],
};
const REQUERIDAS = ["ruta", "semana", "dia", "secuencia", "sap", "pdv", "lat", "lng", "hora", "minVis", "acumFin"];

function valor(cell) {
  let v = cell?.value;
  if (v && typeof v === "object") {
    if ("result" in v) v = v.result;
    else if ("richText" in v) v = v.richText.map((t) => t.text).join("");
    else if ("text" in v) v = v.text;
  }
  return v ?? null;
}
const num = (v) => {
  if (v === null || v === "") return 0;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const txt = (v) => (v === null || v === undefined ? "" : String(v).trim());
const r = (n, d) => Math.round(n * 10 ** d) / 10 ** d;
function hora(v) {
  if (v instanceof Date) return `${String(v.getUTCHours()).padStart(2, "0")}:${String(v.getUTCMinutes()).padStart(2, "0")}`;
  if (typeof v === "number") {
    const m = Math.round(v * 24 * 60);
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  }
  const s = txt(v);
  const m = /^(\d{1,2}):(\d{2})/.exec(s);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : s;
}

// Busca la fila de encabezados (la que contiene todas las palabras pedidas).
function encabezados(ws, claves, maxFilas = 15) {
  for (let i = 1; i <= Math.min(maxFilas, ws.rowCount); i++) {
    const row = ws.getRow(i);
    const map = {};
    row.eachCell({ includeEmpty: false }, (c, col) => {
      map[norm(valor(c))] = col;
    });
    if (claves.every((k) => k in map)) return { fila: i, map };
  }
  return null;
}

function nombreDesdeArchivo(file) {
  const base = path.basename(file, path.extname(file)).replace(/[_-]+/g, " ").trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}
function slugDesdeArchivo(file) {
  return norm(path.basename(file, path.extname(file))).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function convertir(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const avisos = [];

  // Hoja de detalle: DETALLE_MALLA o la primera que tenga la columna RUTA - USUARIO
  let ws = wb.getWorksheet("DETALLE_MALLA");
  let head = ws && encabezados(ws, ["SECUENCIA"]);
  if (!head) {
    for (const s of wb.worksheets) {
      const h = encabezados(s, ["SECUENCIA", "LATITUD"]);
      if (h) { ws = s; head = h; break; }
    }
  }
  if (!head) throw new Error("no encontré la hoja de detalle (se busca una fila con SECUENCIA y LATITUD)");

  const col = {};
  for (const [k, nombres] of Object.entries(COLS)) {
    const hit = nombres.find((n) => n in head.map);
    if (hit) col[k] = head.map[hit];
  }
  const faltan = REQUERIDAS.filter((k) => !col[k]);
  if (faltan.length) throw new Error(`faltan columnas en ${ws.name}: ${faltan.map((k) => COLS[k][0]).join(", ")}`);

  const filas = [];
  for (let i = head.fila + 1; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const g = (k) => (col[k] ? valor(row.getCell(col[k])) : null);
    const ruta = txt(g("ruta"));
    if (!ruta) continue;
    const lat = num(g("lat")), lng = num(g("lng"));
    const dia = norm(g("dia"));
    if (!lat || !lng) { avisos.push(`fila ${i}: sin coordenadas, se omite`); continue; }
    if (!DIAS.includes(dia)) { avisos.push(`fila ${i}: día "${txt(g("dia"))}" no reconocido, se omite`); continue; }
    filas.push({
      fila: i, ruta, semana: num(g("semana")), dia, patron: txt(g("patron")), secuencia: num(g("secuencia")),
      sap: txt(g("sap")), pdv: txt(g("pdv")), region: txt(g("region")), cedi: txt(g("cedi")), ciudad: txt(g("ciudad")),
      barrio: txt(g("barrio")), tier: txt(g("tier")), fdv: txt(g("fdv")), canal: txt(g("canal")), lat, lng,
      minVis: num(g("minVis")), km: num(g("km")), minPlan: num(g("minPlan")), minCarro: num(g("minCarro")), minPie: num(g("minPie")),
      transp: norm(g("transporte")) && norm(g("transporte")) !== "A PIE" ? 1 : 0,
      hora: hora(g("hora")), acumFin: num(g("acumFin")),
      fueraPerim: norm(g("fueraPerim")) === "SI" ? 1 : 0, invertida: norm(g("invertida")) === "SI" ? 1 : 0,
    });
  }
  if (!filas.length) throw new Error("la hoja de detalle no tiene filas válidas");

  // Alertas (opcional)
  const pdvAlerts = {}, routeNotes = {}, dayAlerts = {};
  const wsA = wb.getWorksheet("ALERTAS");
  const hA = wsA && encabezados(wsA, ["CODIGO", "RUTA", "DETALLE"]);
  if (hA) {
    const [cC, cR, cS, cP, cD] = ["CODIGO", "RUTA", "CODIGO SAP", "PUNTO DE VENTA", "DETALLE"].map((k) => hA.map[k]);
    for (let i = hA.fila + 1; i <= wsA.rowCount; i++) {
      const row = wsA.getRow(i);
      const code = txt(valor(row.getCell(cC))), ruta = txt(valor(row.getCell(cR)));
      if (!/^A\d$/.test(code)) continue;
      const det = txt(valor(row.getCell(cD)));
      const sap = cS ? txt(valor(row.getCell(cS))) : "";
      if (code === "A5") {
        const m = /SEMANA\s*(\d+)\s+([A-Z]+)/.exec(norm(cP ? valor(row.getCell(cP)) : ""));
        if (m) (dayAlerts[`${ruta}|${+m[1]}|${m[2]}`] ||= []).push([code, det]);
      } else if (code === "A2") {
        (routeNotes[ruta] ||= []).push([code, `${sap}: ${det}`]);
      } else if (sap) {
        (pdvAlerts[sap] ||= []).push([code, det]);
      }
    }
  } else {
    avisos.push("sin hoja ALERTAS (opcional)");
  }

  // Diccionarios
  const uniq = (k) => [...new Set(filas.map((f) => f[k]))].sort((a, b) => a.localeCompare(b, "es"));
  const barrios = uniq("barrio"), ciudades = uniq("ciudad"), canales = uniq("canal"), fdvs = uniq("fdv");
  const ix = (arr) => Object.fromEntries(arr.map((v, i) => [v, i]));
  const bI = ix(barrios), cI = ix(ciudades), kI = ix(canales), fI = ix(fdvs);

  const rutas = uniq("ruta");
  const uI = ix(rutas);
  const users = rutas.map((id) => {
    const fs = filas.filter((f) => f.ruta === id);
    const cnt = {};
    fs.forEach((f) => { if (f.ciudad) cnt[f.ciudad] = (cnt[f.ciudad] || 0) + 1; });
    return {
      id,
      region: fs[0].region,
      cedi: fs[0].cedi,
      ciudades: Object.entries(cnt).sort((a, b) => b[1] - a[1]).map((e) => e[0]),
      notas: routeNotes[id] || [],
    };
  });

  const pdv = {};
  for (const f of filas) {
    if (pdv[f.sap]) continue;
    pdv[f.sap] = [f.pdv, bI[f.barrio], cI[f.ciudad], f.tier, fI[f.fdv], kI[f.canal], r(f.lat, 6), r(f.lng, 6), uI[f.ruta], f.patron, f.fueraPerim, f.invertida, pdvAlerts[f.sap] || []];
  }

  const diasUsados = DIAS.filter((d) => filas.some((f) => f.dia === d));
  const semanas = [...new Set(filas.map((f) => f.semana))].sort((a, b) => a - b);
  const grupos = new Map();
  for (const f of filas) {
    const k = `${f.ruta}|${f.semana}|${f.dia}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(f);
  }
  const days = [...grupos.entries()].map(([k, fs]) => {
    fs.sort((a, b) => a.secuencia - b.secuencia);
    const [ruta, sem, dia] = k.split("|");
    return {
      u: uI[ruta], w: +sem, d: diasUsados.indexOf(dia),
      s: fs.map((f, i) => [f.sap, f.secuencia, f.hora, f.minVis,
        i ? r(f.km, 3) : 0, i ? r(f.minPlan, 1) : 0, i ? r(f.minPie, 1) : 0, i ? r(f.minCarro, 1) : 0, f.transp, r(f.acumFin, 1)]),
      a: dayAlerts[k] || [],
    };
  }).sort((a, b) => a.u - b.u || a.w - b.w || a.d - b.d);

  return {
    data: {
      dias: diasUsados, semanas, users, barrios, ciudades, canales, fdvs, pdv, days,
      stopCols: ["sap", "seq", "hora", "minVis", "km", "minPlan", "minPie", "minCarro", "transp", "acumFin"],
      pdvCols: ["nombre", "barrio", "ciudad", "tier", "fdv", "canal", "lat", "lng", "user", "patron", "fueraPerim", "invertida", "alertas"],
    },
    resumen: { rutas: users.length, pdv: Object.keys(pdv).length, visitas: filas.length, hoja: ws.name },
    avisos,
  };
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const files = (await readdir(MALLAS)).filter((f) => /\.xlsx$/i.test(f) && !f.startsWith("~$")).sort();
  if (!files.length) throw new Error("No hay archivos .xlsx en la carpeta mallas/");

  const index = [];
  for (const f of files) {
    const full = path.join(MALLAS, f);
    try {
      const { data, resumen, avisos } = await convertir(full);
      const slug = slugDesdeArchivo(f);
      const nombre = nombreDesdeArchivo(f);
      const mod = (await stat(full)).mtime.toISOString();
      await writeFile(path.join(OUT, `${slug}.json`), JSON.stringify({ slug, nombre, archivo: f, actualizado: mod, ...data }));
      index.push({ slug, nombre, archivo: f, actualizado: mod, ...resumen });
      console.log(`✓ ${f} → data/${slug}.json · ${resumen.rutas} rutas · ${resumen.pdv} PDV · ${resumen.visitas} visitas`);
      avisos.slice(0, 10).forEach((a) => console.log(`  · ${a}`));
      if (avisos.length > 10) console.log(`  · …y ${avisos.length - 10} avisos más`);
    } catch (e) {
      console.error(`✗ ${f}: ${e.message}`);
      process.exitCode = 1;
    }
  }
  if (!index.length) throw new Error("Ninguna malla se pudo convertir");
  await writeFile(path.join(OUT, "index.json"), JSON.stringify({ mallas: index }));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
