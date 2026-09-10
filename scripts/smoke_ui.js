"use strict";
// Smoke de la UI sin navegador: stubs mínimos de DOM/fetch sobre app.js.
// Uso: node scripts/smoke_ui.js
const fs = require("fs");
const path = require("path");
const raiz = path.join(__dirname, "..");

function fakeEl() {
  return {
    innerHTML: "", textContent: "", value: "", dataset: {}, listeners: {},
    addEventListener(t, fn) { this.listeners[t] = fn; },
    closest() { return null; },
    querySelector() { return null; },
  };
}

const elApp = fakeEl();
const seleccionados = new Map();

global.document = {
  getElementById: id => (id === "app" ? elApp : fakeEl()),
  querySelector: sel => {
    if (!seleccionados.has(sel)) seleccionados.set(sel, fakeEl());
    return seleccionados.get(sel);
  },
};
global.window = {
  addEventListener: (t, fn) => { if (t === "hashchange") global.__route = fn; },
  scrollTo: () => {},
};
global.location = { hash: "#/" };
global.history = { back: () => {} };
global.fetch = url => {
  const p = path.join(raiz, url);
  return Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(fs.readFileSync(p, "utf8"))) });
};

require(path.join(raiz, "app.js"));

const checks = [
  ["home muestra los días", () => elApp.innerHTML.includes("Push") && elApp.innerHTML.includes("Pierna")],
  ["push: cobertura con 25 tarjetas", () => {
    global.location.hash = "#/dia/push";
    global.__route();
    const html = elApp.innerHTML;
    const tarjetas = (html.match(/class="card"/g) || []).length;
    return html.includes("Sesión sugerida") && html.includes("Cobertura del día") && tarjetas === 25 && html.includes("Pecho");
  }],
  ["detalle: pasos y músculos", () => {
    global.location.hash = "#/detalle/0025";
    global.__route();
    const html = elApp.innerHTML;
    return html.includes("Press de banca con barra") && html.includes("Técnica paso a paso") && html.includes("Pecho");
  }],
];

setTimeout(() => {
  global.location.hash = "#/buscar";
  global.__route();
  setTimeout(() => {
    checks.push(["buscar: 1324 resultados", () =>
      seleccionados.get("#cuenta").textContent.includes("1324")]);
    checks.push(["buscar: filtrar por texto", () => {
      seleccionados.get("#q").listeners.input({ target: { value: "curl" } });
      const n = parseInt(seleccionados.get("#cuenta").textContent, 10);
      return n > 0 && n < 1324 && seleccionados.get("#resultados").innerHTML.includes("curl");
    }]);
    checks.push(["buscar: filtro por día", () => {
      seleccionados.get("#q").listeners.input({ target: { value: "" } });
      seleccionados.get("#f-dia").listeners.change({ target: { value: "pierna" } });
      const n = parseInt(seleccionados.get("#cuenta").textContent, 10);
      return n > 0 && n < 1324;
    }]);

    let fallos = 0;
    for (const [nombre, fn] of checks) {
      let ok = false;
      try { ok = fn(); } catch (e) { console.error("error en", nombre, e.message); }
      console.log((ok ? "ok   " : "FALLO") + " - " + nombre);
      if (!ok) fallos++;
    }
    if (fallos) { console.error(fallos + " fallo(s)"); process.exit(1); }
    console.log("SMOKE UI OK");
  }, 100);
}, 100);
