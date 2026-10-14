# Malla de Rutas

Tablero web para revisar las mallas de rutas de activación. Para cada ruta-usuario muestra el mes por semana y día, la secuencia de PDV en un mapa de calles, la jornada, las alertas y el itinerario. Cada día se puede abrir en Google Maps por tramos, con tráfico en vivo en modo carro.

Cada vista tiene su propio link, por ejemplo:

```
https://tu-proyecto.vercel.app/?malla=malla-red-bull&ruta=ACTIVADORMARCA.BOGOTA1&semana=1&dia=lunes
```

El botón **Copiar link de esta vista** copia ese link para mandarlo a un supervisor o activador.

## Correr en tu computador

Requiere Node.js 18 o superior.

```bash
npm install
npm run dev
```

Abre http://localhost:5173. Cada vez que corres `npm run dev` o `npm run build`, los Excel de la carpeta `mallas/` se convierten a JSON en `public/data/`.

## Actualizar o agregar una malla

1. Pon el Excel en la carpeta `mallas/`. El nombre del archivo es el nombre que se ve en la página (`Malla_Red_Bull.xlsx` se muestra como "Malla Red Bull").
2. Si hay más de un Excel, aparece un selector de malla arriba a la derecha.
3. Para reemplazar una malla, sobrescribe el archivo con el mismo nombre. Así los links que ya compartiste siguen funcionando.
4. Sube el cambio (ver "Desplegar"). Vercel vuelve a construir la página con la malla nueva.

Si un Excel tiene un error (falta una columna, por ejemplo), el build falla y Vercel deja publicada la versión anterior. El mensaje del error dice qué archivo y qué columna revisar.

### Columnas que lee

Hoja `DETALLE_MALLA` (o la primera hoja con las columnas SECUENCIA y LATITUD). Los encabezados pueden estar en cualquiera de las primeras 15 filas.

| Obligatorias | Opcionales |
|---|---|
| RUTA - USUARIO, SEMANA, DIA, SECUENCIA, Codigo SAP, Punto de Venta, Latitud, Longitud, HORA_LLEGADA, MIN VIS, MIN_ACUM_FIN | PATRON, Región, Cedi, Ciudad, Barrio, TIER, FDV, Canal Red Bull, KM_VIA_EST_ANT, MIN_DESPLAZ_ANT, Min_carro, Min_pie, Tipo transporte, COORD_FUERA_PERIMETRO, COORD_INVERTIDA |

Hoja `ALERTAS` (opcional): columnas Código, RUTA, Codigo SAP, Punto de Venta y Detalle, con los códigos A1 a A5.

## Desplegar en Vercel

### Opción A: con GitHub (recomendada)

Así cada cambio de malla se publica solo.

1. Crea un repositorio **privado** en GitHub y sube esta carpeta (sin `node_modules`).
2. En vercel.com, entra con tu cuenta y elige **Add New → Project**.
3. Importa el repositorio. Vercel detecta Vite; no hay que cambiar nada (el build es `npm run build` y la salida es `dist`).
4. Pulsa **Deploy**. En uno o dos minutos tienes el link `https://<nombre>.vercel.app`.

Para actualizar: sube el Excel nuevo a `mallas/` en GitHub (desde la web con "Add file → Upload files" sirve) y Vercel publica la nueva versión automáticamente.

### Opción B: desde la terminal, sin GitHub

```bash
npm install
npx vercel          # la primera vez pide iniciar sesión y crea el proyecto
npx vercel --prod   # publica en el link definitivo
```

Para actualizar, cambia el Excel y vuelve a correr `npx vercel --prod`.

## Notas

- **Acceso:** cualquiera que tenga el link puede ver la malla. La página pide a los buscadores no indexarla, pero eso no es una protección. Si más adelante necesitan contraseña, se puede agregar en Vercel.
- **Mapa de calles:** usa los mapas de OpenStreetMap, que sirven para un uso moderado como este. Si muchas personas lo usan a diario, conviene un proveedor con clave (MapTiler o Stadia Maps, por ejemplo) y configurar en Vercel las variables `VITE_MAPA_TILES` (URL de los tiles) y `VITE_MAPA_ATRIBUCION`.
- **Google Maps:** cada link acepta hasta 10 puntos, por eso cada día se parte en tramos. En celular conviene abrirlos con la app de Google Maps, porque el navegador del celular acepta menos paradas.
- **Tiempos a pie:** la malla calcula el desplazamiento a unos 22 km/h, también en los trayectos marcados "A pie". El tablero muestra a qué hora terminaría la jornada usando la columna Min_pie del archivo, para comparar.

## Estructura

```
mallas/                    Excel de las mallas (la fuente de datos)
scripts/convertir-mallas.mjs  Convierte los Excel a JSON en cada build
src/App.jsx                Estado de la página y link por vista
src/components/            Mes, jornada, tramos, alertas, mapa e itinerario
src/lib/model.js           Cálculos de la jornada y armado de tramos de Google Maps
```
