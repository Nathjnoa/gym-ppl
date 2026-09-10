"use strict";

const TARGET_ES = {
  "abductors":"Abductores","abs":"Abdomen","adductors":"Aductores","biceps":"Bíceps",
  "calves":"Pantorrillas","cardiovascular system":"Cardio","delts":"Hombros","forearms":"Antebrazos",
  "glutes":"Glúteos","hamstrings":"Isquiosurales","hip flexors":"Flexores de cadera","lats":"Dorsales",
  "levator scapulae":"Elevador de la escápula","pectorals":"Pecho","quads":"Cuádriceps",
  "serratus anterior":"Serrato anterior","spine":"Espalda baja","traps":"Trapecio",
  "triceps":"Tríceps","upper back":"Espalda alta"
};
const BODY_ES = {
  "back":"Espalda","cardio":"Cardio","chest":"Pecho","lower arms":"Antebrazos","lower legs":"Pantorrillas",
  "neck":"Cuello","shoulders":"Hombros","upper arms":"Brazos","upper legs":"Piernas","waist":"Abdomen"
};
const EQUIP_ES = {
  "assisted":"Asistido","band":"Banda","barbell":"Barra","body weight":"Peso corporal","bosu ball":"Bosu",
  "cable":"Polea","dumbbell":"Mancuernas","ez barbell":"Barra Z","kettlebell":"Kettlebell",
  "leverage machine":"Máquina","medicine ball":"Balón medicinal","olympic barbell":"Barra olímpica",
  "resistance band":"Banda elástica","roller":"Rodillo","rope":"Cuerda","skierg machine":"Máquina de esquí",
  "sled machine":"Trineo","smith machine":"Smith","stability ball":"Fitball",
  "stationary bike":"Bicicleta fija","tire":"Llanta","trap bar":"Barra hexagonal",
  "upper body ergometer":"Ergómetro","weighted":"Con peso","wheel roller":"Rueda abdominal"
};
const DIA_TITULO = {push:"Push", pull:"Pull", pierna:"Pierna", core:"Core (opcional)"};
const TARGET_DIA = {
  "pectorals":"push","delts":"push","triceps":"push","serratus anterior":"push",
  "lats":"pull","upper back":"pull","traps":"pull","spine":"pull","biceps":"pull","forearms":"pull",
  "quads":"pierna","hamstrings":"pierna","glutes":"pierna","calves":"pierna","adductors":"pierna",
  "abductors":"pierna","hip flexors":"pierna","abs":"core"
};
const BODY_DIA = {"chest":"push","shoulders":"push","back":"pull","upper legs":"pierna","lower legs":"pierna","waist":"core"};

const $app = document.getElementById("app");
const $ = sel => document.querySelector(sel);
let ppl = [], guias = null, library = null, cargandoLib = null;
let diaActual = null, filtroEquipoDia = "";
const busqueda = {texto:"", dia:"", musculo:"", equipo:""};

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const equip = e => EQUIP_ES[e] || (e ? e.charAt(0).toUpperCase() + e.slice(1) : "");
const musculo = t => TARGET_ES[t] || t;
const diaDe = r => TARGET_DIA[r.target] || BODY_DIA[r.body_part] || null;
const mostrar = html => { $app.innerHTML = html; };

function chips(r){
  const vistos = new Set();
  const lista = [r.target].concat(r.secondary_muscles || []).filter(t => t && !vistos.has(t) && vistos.add(t));
  return lista.map((t, i) => `<span class="chip${i === 0 ? " target" : ""}">${esc(musculo(t))}</span>`).join("");
}

function card(r){
  const nombre = r.nombre_es || r.name;
  return `<article class="card" data-id="${esc(r.id)}">
    <img src="${esc(r.gif_url)}" alt="${esc(nombre)}" loading="lazy" width="96" height="96">
    <div>
      <h3>${esc(nombre)}</h3>
      ${r.nombre_es ? `<p class="en">${esc(r.name)}</p>` : ""}
      <p class="meta">${esc(equip(r.equipment))}</p>
      <p class="chips">${chips(r)}</p>
      ${r.tip ? `<p class="tip">${esc(r.tip)}</p>` : ""}
    </div>
  </article>`;
}

const bloqueHTML = b => `<div class="bloque"><h3>${esc(b.titulo)}</h3><p>${esc(b.texto)}<span class="cita">${esc(b.cita)}</span></p></div>`;

function renderHome(){
  const desc = {
    push:"Pecho, hombro y tríceps", pull:"Espalda y bíceps",
    pierna:"Cuádriceps, isquios, glúteos y pantorrilla", core:"Abdomen (opcional)"
  };
  const n = d => ppl.filter(r => r.dia === d).length;
  mostrar(`<h1>Elige tu día</h1>
    <div class="dias">
      ${["push","pull","pierna"].map(d => `<a class="dia ${d}" href="#/dia/${d}"><h3>${DIA_TITULO[d]}</h3><p>${desc[d]} · ${n(d)} ejercicios</p></a>`).join("")}
    </div>
    <a class="btn" href="#/dia/core">Core (opcional) · ${n("core")} ejercicios</a>
    <a class="btn" href="#/buscar">Buscar en los 1,324 ejercicios</a>
    <h2>Principios generales</h2>
    ${((guias && guias.principios) || []).map(bloqueHTML).join("")}`);
}

function renderDia(d){
  if (d !== diaActual) { filtroEquipoDia = ""; diaActual = d; }
  const items = ppl.filter(r => r.dia === d).sort((a, b) => a.orden - b.orden);
  if (!items.length) { renderHome(); return; }
  const equipos = [...new Set(items.map(r => r.equipment))]
    .sort((a, b) => equip(a).localeCompare(equip(b), "es"));
  const visibles = filtroEquipoDia ? items.filter(r => r.equipment === filtroEquipoDia) : items;
  const sug = visibles.filter(r => r.sesion === "sugerido");
  const opc = visibles.filter(r => r.sesion !== "sugerido");
  const cobertura = {};
  for (const r of visibles) cobertura[r.target] = (cobertura[r.target] || 0) + 1;
  const cob = Object.entries(cobertura).sort((a, b) => b[1] - a[1])
    .map(([t, c]) => `<span class="chip">${esc(musculo(t))} ${c}</span>`).join("");
  const chipsEquipo = [`<button class="chip filtro${filtroEquipoDia === "" ? " activo" : ""}" data-equipo="">Todos</button>`]
    .concat(equipos.map(e => `<button class="chip filtro${filtroEquipoDia === e ? " activo" : ""}" data-equipo="${esc(e)}">${esc(equip(e))}</button>`))
    .join("");
  const guia = guias && guias.dias && guias.dias[d];
  mostrar(`<a class="volver" href="#/" data-back>&larr; Todos los días</a>
    <h1>${DIA_TITULO[d]}</h1>
    ${guia ? `<p class="aviso">${esc(guia.nota)}</p>` : ""}
    <h2>Equipo</h2><div class="cobertura">${chipsEquipo}</div>
    <h2>Cobertura del día</h2><div class="cobertura">${cob}</div>
    ${sug.length ? `<h2>Sesión sugerida</h2><div class="lista">${sug.map(card).join("")}</div>` : ""}
    ${opc.length ? `<h2>Más opciones</h2><div class="lista">${opc.map(card).join("")}</div>` : ""}
    ${!visibles.length ? `<p class="vacio">Sin ejercicios de ese equipo en este día.</p>` : ""}
    ${guia ? `<h2>Consejos del día</h2>${guia.bloques.map(bloqueHTML).join("")}` : ""}`);
}

function cargarLibrary(){
  if (library) return Promise.resolve(library);
  if (!cargandoLib) {
    cargandoLib = fetch("data/library.json").then(r => r.json()).then(d => { library = d; return d; });
  }
  return cargandoLib;
}

function renderDetalle(id){
  const cur = ppl.find(x => x.id === id);
  const r = cur || (library && library.find(x => x.id === id));
  if (!r) {
    mostrar(`<p class="cargando">Cargando ejercicio…</p>`);
    cargarLibrary().then(() => renderDetalle(id)).catch(() => mostrar(`<p class="vacio">No se encontró el ejercicio.</p>`));
    return;
  }
  const nombre = r.nombre_es || r.name;
  mostrar(`<a class="volver" href="#/" data-back>&larr; Volver</a>
    <div class="detalle">
      <img src="${esc(r.gif_url)}" alt="${esc(nombre)}" width="180" height="180">
      <h1>${esc(nombre)}</h1>
      ${r.nombre_es ? `<p class="en">${esc(r.name)}</p>` : ""}
      <p class="meta">${esc(equip(r.equipment))}</p>
      <p class="chips">${chips(r)}</p>
      ${cur ? `<div class="bloque"><h3>Cómo sentirlo</h3><p>${esc(cur.tip)}</p></div>
        <div class="bloque"><h3>Error típico</h3><p>${esc(cur.clave)}</p></div>` : ""}
      <h2>Técnica paso a paso</h2>
      <ol class="pasos">${(r.steps_es || []).map(p => `<li>${esc(p)}</li>`).join("")}</ol>
      <p class="cita">Media: © Gym visual — https://gymvisual.com/</p>
    </div>`);
}

function filtrarLibrary(){
  const texto = busqueda.texto.toLowerCase().trim();
  return library.filter(r => {
    if (busqueda.dia && diaDe(r) !== busqueda.dia) return false;
    if (busqueda.musculo && r.target !== busqueda.musculo) return false;
    if (busqueda.equipo && r.equipment !== busqueda.equipo) return false;
    if (!texto) return true;
    const blob = [r.name, musculo(r.target), BODY_ES[r.body_part] || r.body_part, equip(r.equipment),
      (r.secondary_muscles || []).map(musculo).join(" ")].join(" ").toLowerCase();
    return blob.indexOf(texto) !== -1;
  });
}

function pintarResultados(){
  const res = filtrarLibrary();
  $("#cuenta").textContent = res.length + " resultado(s)";
  $("#resultados").innerHTML = res.slice(0, 80).map(card).join("") ||
    `<p class="vacio">Sin resultados. Prueba otro término o quita filtros.</p>`;
  $("#tope").textContent = res.length > 80 ? "Mostrando los primeros 80; afina la búsqueda." : "";
}

function renderBuscar(){
  if (!library) {
    mostrar(`<p class="cargando">Cargando biblioteca completa (1,324)…</p>`);
    cargarLibrary().then(renderBuscar).catch(() => mostrar(`<p class="vacio">No se pudo cargar la biblioteca.</p>`));
    return;
  }
  const targets = [...new Set(library.map(r => r.target))].sort((a, b) => musculo(a).localeCompare(musculo(b), "es"));
  const equipos = [...new Set(library.map(r => r.equipment))].sort((a, b) => equip(a).localeCompare(equip(b), "es"));
  const opt = (v, t) => `<option value="${esc(v)}"${busqueda.dia === v ? " selected" : ""}>${t}</option>`;
  mostrar(`<a class="volver" href="#/" data-back>&larr; Inicio</a>
    <h1>Biblioteca completa</h1>
    <div class="grid-filtros">
      <input type="search" id="q" placeholder="Buscar ejercicio…" value="${esc(busqueda.texto)}">
      <select id="f-dia">${opt("", "Todos los días")}${opt("push", "Push")}${opt("pull", "Pull")}${opt("pierna", "Pierna")}${opt("core", "Core")}</select>
      <select id="f-musculo"><option value="">Todos los músculos</option>
        ${targets.map(t => `<option value="${esc(t)}"${busqueda.musculo === t ? " selected" : ""}>${esc(musculo(t))}</option>`).join("")}
      </select>
      <select id="f-equipo"><option value="">Todo el equipo</option>
        ${equipos.map(e => `<option value="${esc(e)}"${busqueda.equipo === e ? " selected" : ""}>${esc(equip(e))}</option>`).join("")}
      </select>
    </div>
    <p class="aviso" id="cuenta"></p>
    <div class="lista" id="resultados"></div>
    <p class="aviso" id="tope"></p>`);
  $("#q").addEventListener("input", e => { busqueda.texto = e.target.value; pintarResultados(); });
  $("#f-dia").addEventListener("change", e => { busqueda.dia = e.target.value; pintarResultados(); });
  $("#f-musculo").addEventListener("change", e => { busqueda.musculo = e.target.value; pintarResultados(); });
  $("#f-equipo").addEventListener("change", e => { busqueda.equipo = e.target.value; pintarResultados(); });
  pintarResultados();
}

function route(){
  const h = location.hash.replace(/^#\/?/, "");
  const [vista, param] = h.split("/");
  if (vista === "dia" && param && DIA_TITULO[param]) renderDia(param);
  else if (vista === "detalle" && param) renderDetalle(param);
  else if (vista === "buscar") renderBuscar();
  else renderHome();
  window.scrollTo(0, 0);
}

$app.addEventListener("click", e => {
  if (e.target.closest("[data-back]")) { e.preventDefault(); history.back(); return; }
  const chipEq = e.target.closest("[data-equipo]");
  if (chipEq && diaActual) { filtroEquipoDia = chipEq.dataset.equipo; renderDia(diaActual); return; }
  const el = e.target.closest(".card");
  if (el && el.dataset.id) location.hash = "#/detalle/" + el.dataset.id;
});

Promise.all([
  fetch("data/ppl.json").then(r => r.json()),
  fetch("data/guias.json").then(r => r.json())
]).then(([p, g]) => {
  ppl = p; guias = g;
  window.addEventListener("hashchange", route);
  route();
}).catch(() => {
  mostrar(`<p class="vacio">No se pudieron cargar los datos. Abre la página desde el link publicado o desde un servidor local.</p>`);
});
