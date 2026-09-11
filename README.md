# gym-ppl

Página web estática en español para consultar los ejercicios de una rutina
push/pull/pierna (y core opcional): GIF animado, técnica paso a paso en
español, músculos trabajados (principal y secundarios), consejos de técnica y
una guía general por día con fuentes.

Pensada para un grupo pequeño de amigos, en el celular, sin instalar nada.
El stack es a propósito lo más simple posible: HTML/CSS/JS vanilla, sin build,
sin frameworks, sin backend. Publicar = `git push`.

## Cómo usarla

**Link:** https://nathjnoa.github.io/gym-ppl/

Mientras tanto, en local:

```bash
python3 -m http.server 8080
# abrir http://localhost:8080
```

- Inicio: Push / Pull / Pierna + Core (opcional) + buscador.
- Cada día: filtro rápido por equipo (barra, mancuerna, polea, máquina…),
  cobertura por músculo, sesión sugerida (6-8 ejercicios) y más opciones del
  pool curado.
- Toca una tarjeta para ver el GIF, la técnica numerada, cómo sentirlo y el
  error típico.
- **Mi sesión:** añade ejercicios con "+ Añadir a mi sesión" y marca tus series
  (1-4) mientras entrenas. Se guarda en el navegador del celular
  (`localStorage`), no en internet; si borras los datos del sitio, se pierde.
  No se sincroniza entre dispositivos.
- Buscar: filtra los 1,324 ejercicios del dataset por día, músculo y equipo.

## Estructura

```
index.html, app.js, styles.css   # UI completa, sin dependencias
data/
  curacion.csv                   # fuente de verdad: 75 PPL + 8 core
  guias.json                     # guía por día con citas (PMID)
  ppl.json                       # generado: curados completos en español
  library.json                   # generado: 1,324 slim (carga diferida)
media/                           # 83 GIFs de la curación, copiados al repo
scripts/
  build_data.py                  # descarga el dataset, cruza curación y genera JSONs
  check.py                       # validación de datos (offline y --online)
  smoke_ui.js                    # smoke de la UI sin navegador (node)
docs/superpowers/                # spec y plan de implementación
```

## Actualizar datos o curación

Edita `data/curacion.csv` (columnas: `id,dia,orden,nombre_es,tip,clave,sesion`;
`dia` ∈ push|pull|pierna|core; `sesion` ∈ sugerido|opcion) y regenera:

```bash
python3 scripts/build_data.py     # descarga upstream si falta y regenera JSONs
python3 scripts/check.py          # integridad local
python3 scripts/check.py --online # además verifica media (HEAD) de los curados
node scripts/smoke_ui.js          # smoke de la interfaz
```

El script falla con error claro si un `id` de la curación no existe en el
dataset. El mapa día↔músculo vive en `scripts/build_data.py`.

El dataset upstream está fijado a un commit (`UPSTREAM_SHA` en `build_data.py`)
y los GIFs de la curación se copian a `media/` para que la página no dependa de
cambios externos. La biblioteca completa usa el CDN fijado a ese mismo commit.
Para subir de versión del dataset, cambia el SHA y vuelve a correr el build.

## Créditos, licencias y aviso

- Datos e instrucciones: [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset)
  (MIT). Los nombres de ejercicios originales están en inglés; la capa curada
  añade `nombre_es`.
- Media (imágenes y GIFs, 180×180): © [Gym visual](https://gymvisual.com/),
  redistribuida con permiso. No cubierta por MIT; ver `LICENSE` y mantener la
  atribución.
- Código, curación y guías de este repositorio: MIT (`LICENSE`).
- La guía general es información para adultos sanos con objetivo de
  hipertrofia y **no es consejo médico**. Si hay dolor, lesión o una condición
  de salud, consulten a un profesional.
