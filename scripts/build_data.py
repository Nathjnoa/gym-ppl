#!/usr/bin/env python3
"""Genera data/library.json (1324 slim) y data/ppl.json (curado) desde el dataset upstream.

Uso: python3 scripts/build_data.py
Solo stdlib. Upstream crudo queda en data/raw/ (ignorado por git).
"""
import csv
import json
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
RAW = os.path.join(DATA, "raw")
# Dataset fijado a un commit para que la página no cambie bajo los pies (bump manual).
UPSTREAM_SHA = "7455efae41b330c265e7cd4b78dfa848e7ce5ebd"
UPSTREAM = f"https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/{UPSTREAM_SHA}/data/exercises.json"
CDN = f"https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@{UPSTREAM_SHA}/"
MEDIA = os.path.join(ROOT, "media")
ATRIBUCION = "© Gym visual — https://gymvisual.com/"

DAY_BY_TARGET = {
    "pectorals": "push",
    "delts": "push",
    "triceps": "push",
    "serratus anterior": "push",
    "lats": "pull",
    "upper back": "pull",
    "traps": "pull",
    "spine": "pull",
    "biceps": "pull",
    "forearms": "pull",
    "quads": "pierna",
    "hamstrings": "pierna",
    "glutes": "pierna",
    "calves": "pierna",
    "adductors": "pierna",
    "abductors": "pierna",
    "hip flexors": "pierna",
    "abs": "core",
}
DAY_BY_BODY_PART = {
    "chest": "push",
    "shoulders": "push",
    "back": "pull",
    "upper legs": "pierna",
    "lower legs": "pierna",
    "waist": "core",
}


def download(url, dest):
    if os.path.exists(dest):
        print(f"ya existe {dest}")
        return
    print(f"descargando {url}")
    urllib.request.urlretrieve(url, dest)


def steps_es(rec):
    steps = rec.get("instruction_steps", {}).get("es")
    if steps:
        return list(steps)
    texto = rec.get("instructions", {}).get("es", "")
    partes = [p.strip() for p in texto.split(". ") if p.strip()]
    return [p if p.endswith(".") else p + "." for p in partes]


def slim(rec):
    return {
        "id": rec["id"],
        "name": rec["name"],
        "body_part": rec["body_part"],
        "equipment": rec["equipment"],
        "target": rec["target"],
        "secondary_muscles": rec.get("secondary_muscles", []),
        "steps_es": steps_es(rec),
        "image": CDN + rec["image"],
        "gif_url": CDN + rec["gif_url"],
    }


def dia_de(rec):
    return DAY_BY_TARGET.get(rec["target"]) or DAY_BY_BODY_PART.get(rec["body_part"])


def copiar_gif(url):
    """Copia el GIF de un ejercicio curado a media/ y devuelve la ruta local."""
    os.makedirs(MEDIA, exist_ok=True)
    nombre = os.path.basename(url)
    destino = os.path.join(MEDIA, nombre)
    if not os.path.exists(destino):
        download(url, destino)
    return "media/" + nombre


def curar(por_id):
    ruta = os.path.join(DATA, "curacion.csv")
    if not os.path.exists(ruta):
        print("sin data/curacion.csv: se omite ppl.json")
        return None
    filas = []
    with open(ruta, newline="", encoding="utf-8") as fh:
        for fila in csv.DictReader(fh):
            rid = fila["id"].strip()
            if rid not in por_id:
                sys.exit(f"ERROR: id {rid} de curacion.csv no existe en el dataset")
            item = dict(por_id[rid])
            item.update(
                dia=fila["dia"].strip(),
                orden=int(fila["orden"]),
                nombre_es=fila["nombre_es"].strip(),
                tip=fila["tip"].strip(),
                clave=fila["clave"].strip(),
                sesion=fila["sesion"].strip(),
                attribution=ATRIBUCION,
            )
            item["gif_url"] = copiar_gif(item["gif_url"])
            filas.append(item)
    return filas


def facetas(records):
    lineas = ["# target (valor: conteo, dia asignado)"]
    for valor in sorted({r["target"] for r in records}):
        lineas.append(f"{valor}: {sum(1 for r in records if r['target'] == valor)} -> {DAY_BY_TARGET.get(valor, 'SIN MAPA')}")
    lineas.append("\n# body_part")
    for valor in sorted({r["body_part"] for r in records}):
        lineas.append(f"{valor}: {sum(1 for r in records if r['body_part'] == valor)}")
    lineas.append("\n# equipment")
    for valor in sorted({r["equipment"] for r in records}):
        lineas.append(f"{valor}: {sum(1 for r in records if r['equipment'] == valor)}")
    return "\n".join(lineas) + "\n"


def main():
    os.makedirs(RAW, exist_ok=True)
    crudo = os.path.join(RAW, "exercises.json")
    download(UPSTREAM, crudo)
    with open(crudo, encoding="utf-8") as fh:
        records = json.load(fh)
    assert len(records) == 1324, f"esperaba 1324 registros, hay {len(records)}"

    library = [slim(r) for r in records]
    with open(os.path.join(DATA, "library.json"), "w", encoding="utf-8") as fh:
        json.dump(library, fh, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(RAW, "facetas.txt"), "w", encoding="utf-8") as fh:
        fh.write(facetas(records))

    huerfanos = sorted({r["target"] for r in records if dia_de(r) is None})
    print(f"library.json: {len(library)} registros; targets sin dia: {huerfanos or 'ninguno'}")

    ppl = curar({r["id"]: slim(r) for r in records})
    if ppl is not None:
        with open(os.path.join(DATA, "ppl.json"), "w", encoding="utf-8") as fh:
            json.dump(ppl, fh, ensure_ascii=False, separators=(",", ":"))
        por_dia = {}
        for item in ppl:
            por_dia.setdefault(item["dia"], []).append(item["target"])
        print(f"ppl.json: {len(ppl)} curados")
        for dia, targets in sorted(por_dia.items()):
            conteo = {}
            for t in targets:
                conteo[t] = conteo.get(t, 0) + 1
            print(f"  {dia}: {len(targets)} -> " + ", ".join(f"{t}={c}" for t, c in sorted(conteo.items())))


if __name__ == "__main__":
    main()
