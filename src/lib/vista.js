// La vista actual (malla, ruta, semana, día y modo) vive en la URL para poder
// compartir el link exacto de una ruta: ?malla=…&ruta=…&semana=1&dia=lunes

const sinTildes = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");

export function leerVista() {
  const q = new URLSearchParams(window.location.search);
  return {
    malla: q.get("malla"),
    ruta: q.get("ruta"),
    semana: q.get("semana") ? Number(q.get("semana")) : null,
    dia: q.get("dia") ? sinTildes(q.get("dia")).toUpperCase() : null,
    modo: q.get("modo"),
  };
}

export function escribirVista({ malla, ruta, semana, dia, modo }) {
  const q = new URLSearchParams();
  if (malla) q.set("malla", malla);
  if (ruta) q.set("ruta", ruta);
  if (semana) q.set("semana", String(semana));
  if (dia) q.set("dia", dia.toLowerCase());
  if (modo && modo !== "malla") q.set("modo", modo);
  const url = `${window.location.pathname}?${q.toString()}`;
  if (url !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", url);
}

export async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}
