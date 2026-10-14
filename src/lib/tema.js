import { useEffect, useState } from "react";

// Leaflet necesita colores reales (no variables CSS) para las líneas del mapa.
function leer() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n) => cs.getPropertyValue(n).trim();
  return {
    tramos: [1, 2, 3, 4, 5, 6].map((i) => v(`--t${i}`)),
    territorio: v("--terr"),
    panel: v("--panel"),
  };
}

export function useColoresTema() {
  const [c, setC] = useState(leer);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setC(leer());
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return c;
}
