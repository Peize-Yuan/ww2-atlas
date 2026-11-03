"""Rasterize Natural Earth 110m countries into a dot-grid world map for canvas."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "_candidates" / "world.geojson"
OUT = ROOT / "js" / "world-dots.js"

W, H = 1200, 620
LON_MIN, LON_MAX = -180.0, 180.0
LAT_MAX, LAT_MIN = 84.0, -58.0


def project(lon: float, lat: float) -> tuple[float, float]:
    x = (lon - LON_MIN) / (LON_MAX - LON_MIN) * W
    y = (LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * H
    return x, y


def rings(geometry: dict):
    if geometry["type"] == "Polygon":
        yield from geometry["coordinates"]
    elif geometry["type"] == "MultiPolygon":
        for poly in geometry["coordinates"]:
            yield from poly


def main() -> None:
    data = json.loads(SRC.read_text(encoding="utf-8"))
    image = Image.new("RGB", (W, H), (0, 0, 0))
    draw = ImageDraw.Draw(image)
    iso_by_id: dict[int, str] = {}
    for idx, feature in enumerate(data["features"], start=1):
        props = feature["properties"]
        iso = props.get("ADM0_A3") or props.get("ISO_A3") or f"X{idx:03d}"
        if iso in ("ATA",):
            continue
        iso_by_id[idx] = iso
        color = (idx >> 16 & 255, idx >> 8 & 255, idx & 255)
        for ring in rings(feature["geometry"]):
            pts = [project(lon, lat) for lon, lat in ring]
            if len(pts) >= 3:
                draw.polygon(pts, fill=color)

    step = 11
    dots = []
    for y in range(step // 2, H, step):
        for x in range(step // 2, W, step):
            r, g, b = image.getpixel((x, y))
            idx = (r << 16) | (g << 8) | b
            iso = iso_by_id.get(idx)
            if not iso:
                continue
            dots.append([round(x / W, 4), round(y / H, 4), iso])

    grouped: dict[str, list] = {}
    for x, y, iso in dots:
        grouped.setdefault(iso, []).append([x, y])

    js = (
        "/* Generated from Natural Earth 110m (public domain). "
        "Dot-grid schematic only. */\n"
        "window.WORLD_DOTS = "
        + json.dumps({"w": W, "h": H, "countries": grouped}, separators=(",", ":"))
        + ";\n"
    )
    OUT.write_text(js, encoding="utf-8")
    print(f"wrote {OUT} with {len(dots)} dots and {len(grouped)} countries")


if __name__ == "__main__":
    main()
