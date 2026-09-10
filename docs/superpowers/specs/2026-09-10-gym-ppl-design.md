# gym-ppl — Diseño

Fecha: 2026-09-10

## Objetivo

Página web estática en español para que un grupo pequeño de amigos consulte en el
celular los ejercicios de sus rutinas push/pull/pierna: GIF animado, técnica paso a
paso, músculos trabajados (principal y secundarios) y consejos curados. Se comparte
por link (GitHub Pages) y no requiere instalar nada.

## Decisiones acordadas

- **Solo consulta**: sin registro de series/reps, sin login, sin backend.
- **Acceso**: página estática hosteada en GitHub Pages; GIFs/imágenes servidos por
  CDN (jsDelivr) desde el repositorio original del dataset, sin copiar los 128 MB.
- **Contenido**: capa curada PPL (~75 ejercicios, ~25 por día) + biblioteca completa
  de los 1,324 buscable.
- **Core**: sección aparte y opcional (no se mezcla con el día de pierna).
- **Consejos**: pasos de técnica del dataset (español) + 1-2 claves curadas por
  ejercicio + guía general por músculo con fuentes verificadas.
- **Sin días fijos**: el contenido se agrupa por día (push/pull/pierna/core), sin
  splits A/B ni calendario.

## Fuente de datos

[hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset)
(1,324 ejercicios). Campos usados: `id`, `name` (inglés), `body_part`, `equipment`,
`target`, `secondary_muscles`, `instruction_steps.es`, `image`, `gif_url`,
`media_id`, `attribution`.

Licencias: datos/instrucciones MIT; media © Gym Visual (atribución obligatoria,
se conserva en cada ficha y en el pie de página).

Limitación conocida: los nombres de ejercicios solo existen en inglés; en la capa
curada se añade `nombre_es`. La biblioteca completa muestra el nombre original +
instrucciones en español.

## Arquitectura

```
gym_ppl/                        # repo git propio (no depende del repo bioinfo)
├── index.html                  # UI completa (HTML + CSS + JS vanilla, sin build)
├── app.js
├── styles.css
├── data/
│   ├── curacion.csv            # fuente de verdad de la curación (75 filas)
│   ├── guias.json              # guía por músculo (series/reps/descanso/frecuencia + fuentes)
│   ├── ppl.json                # generado: 75 ejercicios completos en es
│   └── library.json            # generado: 1,324 slim en es (carga diferida)
├── scripts/
│   ├── build_data.py           # descarga upstream, cruza curación, genera JSONs
│   └── check.py                # validación de integridad
├── docs/superpowers/specs/2026-09-10-gym-ppl-design.md
├── .gitignore                  # data/raw/ (dataset crudo descargado)
└── README.md
```

Sin frameworks, sin bundler, sin base de datos. Publicar = `git push`.

## Pipeline de datos (`scripts/build_data.py`)

1. Descarga `data/exercises.json` desde el upstream a `data/raw/` (si no existe
   localmente). Solo stdlib (`urllib`, `json`, `csv`).
2. Mapea cada registro a un esquema slim y traduce las rutas de media a URLs del
   CDN (`https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/...`).
3. Cruza `curacion.csv` (id, día, orden, nombre_es, tip, clave, sesion) con el dataset;
   falla con error claro si un id no existe.
4. Escribe `data/ppl.json` (75 completos) y `data/library.json` (1,324 slim).
5. Mapa día↔músculo centralizado en el script, por `target` con respaldo en
   `body_part`: push (pecho, hombro, tríceps), pull (espalda, bíceps, antebrazo,
   trapecio), pierna (cuádriceps, isquios, glúteo, pantorrilla), core (abdomen).

## Curación (`data/curacion.csv`)

- ~25 ejercicios por día, balanceados por músculo: compuestos primero + aislamiento,
  variedad de equipo (barra, mancuerna, máquina, cable, peso corporal).
- Columnas: `id`, `dia`, `orden`, `nombre_es`, `tip` (cómo sentirlo), `clave`
  (error típico), `sesion` (sugerido | opcion).
- La "sesión sugerida" de cada día son los 6-8 primeros por `orden`; el resto queda
  como "más opciones".

## Guías por músculo (`data/guias.json`)

Recomendaciones generales de series, repeticiones, descanso y frecuencia por día,
respaldadas con literatura verificada (ACSM, NSCA, revisiones de hipertrofia). Cada
dato lleva cita inline (fuente + año). Se incluye disclaimer de que no es consejo
médico.

## UI (mobile-first, dark, CSS propio)

- **Inicio**: 3 tarjetas grandes Push / Pull / Pierna + chip secundario "Core
  (opcional)" + buscador.
- **Vista día**: nota del día, contador de cobertura por músculo ("Pecho 3 · Hombro 2
  · Tríceps 2"), sesión sugerida y más opciones.
- **Tarjeta**: GIF (`loading="lazy"`), nombre es + en, equipo, chips de músculo
  principal/secundarios, tip corto.
- **Detalle**: GIF grande, pasos numerados en español, claves, equipo, atribución
  "© Gym visual".
- **Biblioteca**: buscador + filtros (día, músculo, equipo) sobre `library.json`;
  el archivo se descarga solo al primer uso.
- Atribución y licencias visibles en el pie.

## Publicación

- Repo público `gym-ppl` en GitHub + GitHub Pages desde `main` (root).
- URL: `https://<usuario>.github.io/gym-ppl/`.
- Antes de crear el repo y hacer push se pide OK explícito al usuario.

## Verificación

- `python scripts/check.py` (única prueba, sin framework):
  - JSONs generados válidos y completos.
  - Los 75 ids curados existen en el dataset y tienen todos los campos requeridos.
  - Día asignado consistente con `target`/`body_part`.
  - URLs de media de los 75 responden 200 (HEAD con timeout).
- Smoke test manual del link en el celular: un día, un detalle, una búsqueda.

## Fuera de alcance

- Registro de series/reps/peso y progreso.
- Cuentas/login.
- Modo offline / PWA (upgrade natural si el gym no tiene señal).
- Traducir los 1,324 nombres al español.
- Backend o base de datos.
