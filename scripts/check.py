#!/usr/bin/env python3
"""Valida los datos de gym-ppl.

Uso: python3 scripts/check.py [--online]
- Sin flags: integridad de library.json, ppl.json y guias.json.
- --online: además verifica (HEAD) que la media de los curados responde 200.
Sale con código 1 y lista de fallos si algo no cumple; imprime OK si todo pasa.
"""
import argparse
import json
import os
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import build_data  # noqa: E402

DATA = os.path.join(ROOT, "data")
REQUERIDOS = ["id", "name", "body_part", "equipment", "target",
              "secondary_muscles", "steps_es", "image", "gif_url"]
DIAS_PPL = ["push", "pull", "pierna"]


def cargar(nombre):
    ruta = os.path.join(DATA, nombre)
    if not os.path.exists(ruta):
        return None
    with open(ruta, encoding="utf-8") as fh:
        return json.load(fh)


def head_ok(url):
    try:
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status == 200
    except Exception:
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--online", action="store_true")
    args = ap.parse_args()
    fallos = []

    lib = cargar("library.json")
    if not lib:
        fallos.append("library.json no existe")
    else:
        if len(lib) != 1324:
            fallos.append(f"library.json: {len(lib)} registros (esperado 1324)")
        for r in lib:
            faltan = [k for k in REQUERIDOS if not r.get(k)]
            if faltan:
                fallos.append(f"library {r.get('id')}: campos vacíos {faltan}")
            elif not r["image"].startswith(build_data.CDN):
                fallos.append(f"library {r['id']}: image sin prefijo CDN")
        print(f"library.json: {len(lib)} registros")

    ppl = cargar("ppl.json")
    por_dia = {}
    if not ppl:
        fallos.append("ppl.json no existe")
    else:
        ids_lib = {r["id"] for r in lib} if lib else set()
        ids = [r["id"] for r in ppl]
        if len(ids) != len(set(ids)):
            fallos.append("ppl.json: ids duplicados")
        for r in ppl:
            if r["id"] not in ids_lib:
                fallos.append(f"ppl {r['id']}: no existe en library.json")
            esperado = build_data.dia_de(r)
            if r.get("dia") != esperado:
                fallos.append(f"ppl {r['id']} {r['name']}: dia={r.get('dia')} pero el dataset dice {esperado}")
            for campo in ("nombre_es", "tip", "clave", "sesion"):
                if not r.get(campo):
                    fallos.append(f"ppl {r['id']}: {campo} vacío")
            if r.get("sesion") not in ("sugerido", "opcion"):
                fallos.append(f"ppl {r['id']}: sesion inválida ({r.get('sesion')})")
            if not str(r.get("gif_url", "")).startswith("media/"):
                fallos.append(f"ppl {r['id']}: gif_url no es local ({r.get('gif_url')})")
            elif not os.path.exists(os.path.join(ROOT, r["gif_url"])):
                fallos.append(f"ppl {r['id']}: falta el archivo {r['gif_url']}")
            por_dia.setdefault(r.get("dia"), []).append(r)
        for d in DIAS_PPL:
            filas = por_dia.get(d, [])
            if not 23 <= len(filas) <= 27:
                fallos.append(f"ppl dia {d}: {len(filas)} ejercicios (esperado ~25)")
            sug = sum(1 for r in filas if r["sesion"] == "sugerido")
            if not 6 <= sug <= 8:
                fallos.append(f"ppl dia {d}: {sug} sugeridos (esperado 6-8)")
        core = por_dia.get("core", [])
        if not 4 <= len(core) <= 10:
            fallos.append(f"ppl core: {len(core)} ejercicios (esperado 4-10)")
        print("ppl.json:", {d: len(v) for d, v in sorted(por_dia.items())})

    guias = cargar("guias.json")
    if guias:
        if not guias.get("disclaimer"):
            fallos.append("guias.json: falta disclaimer")
        for d in ("push", "pull", "pierna", "core"):
            info = (guias.get("dias") or {}).get(d)
            if not info:
                fallos.append(f"guias.json: falta el día {d}")
                continue
            if not info.get("bloques"):
                fallos.append(f"guias.json: {d} sin bloques")
            for b in info.get("bloques", []):
                if not b.get("texto"):
                    fallos.append(f"guias.json {d}: bloque sin texto")
                if not b.get("cita"):
                    fallos.append(f"guias.json {d}: bloque sin cita")
    else:
        print("guias.json: aún no existe (pendiente)")

    if args.online and ppl:
        urls = [r["image"] for r in ppl if str(r.get("image", "")).startswith("http")]
        print(f"verificando {len(urls)} URLs remotas (miniaturas)...")
        with ThreadPoolExecutor(max_workers=8) as pool:
            resultados = list(pool.map(head_ok, urls))
        malas = [u for u, ok in zip(urls, resultados) if not ok]
        for u in malas:
            fallos.append(f"media no responde 200: {u}")
        print(f"media OK: {len(urls) - len(malas)}/{len(urls)}")

    if fallos:
        print(f"\n{len(fallos)} FALLOS:")
        for f in fallos:
            print(" -", f)
        sys.exit(1)
    print("OK")


if __name__ == "__main__":
    main()
