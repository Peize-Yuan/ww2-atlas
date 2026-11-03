"""Build js/credits.js from the image manifests and known portrait filenames."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "assets" / "images"
CAND = ROOT / "_candidates"

MANUAL = {
    "person-roosevelt": "FDR 1944 Color Portrait (cropped).jpg",
    "person-churchill": "Sir Winston S Churchill (cropped).jpg",
    "person-stalin": "CroppedStalin1943.jpg",
    "person-chiang": "Chiang Kai-shek.jpg",
    "person-hitler": "Adolf Hitler cropped restored.jpg",
    "person-hirohito": "Hirohito in dress uniform.jpg",
    "person-macarthur": "DouglasMacArthur.jpg",
    "person-mussolini": "Benito Mussolini colored.jpg",
    "person-patton": "George S. Patton.jpg",
    "person-montgomery": "General Sir Bernard Montgomery in England, 1943 (cropped).jpg",
    "person-degaulle": "De Gaulle-OWI (cropped)-(c).jpg",
    "person-eisenhower": "(Photograph of General Dwight D. Eisenhower Seated at His Desk) - DPLA - 708598a959455c20ea7b234be97925f6.jpg",
    "person-nimitz": "Fleet Admiral Chester W. Nimitz portrait.jpg",
    "person-tojo": "Hideki Tōjō portrait (cropped).jpg",
    "person-zhukov": "Zhukov-LIFE-1944-1945 cropped.jpg",
    "person-rommel": "Erwin-Rommel-1941 (2).jpg",
    "person-guderian": "Heinz Guderian portrait (cropped).jpg",
}


def commons_url(title: str) -> str:
    name = title.replace("File:", "", 1).replace(" ", "_")
    return "https://commons.wikimedia.org/wiki/File:" + name


def main() -> None:
    credits: dict[str, dict] = {}
    for p in (CAND / "manifest_selected.json", CAND / "manifest_rest.json"):
        if not p.exists():
            continue
        try:
            rows = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        for row in rows:
            slug = row.get("slug")
            if not slug:
                continue
            title = row.get("commons_title") or ""
            lic = row.get("license") or "见 Commons 文件页"
            if "瑙" in lic or "鏂" in lic or "?" in lic:
                lic = "见 Commons 文件页"
            credits[slug] = {
                "artist": row.get("artist") or "Wikimedia Commons",
                "license": lic,
                "descriptionurl": row.get("descriptionurl") or (commons_url(title) if title else "https://commons.wikimedia.org/"),
                "commons_title": title,
            }
    for name in ("portrait_credits.json", "portrait_credits2.json", "equipment_credits.json"):
        p = CAND / name
        if not p.exists():
            continue
        try:
            credits.update(json.loads(p.read_text(encoding="utf-8")))
        except Exception:
            pass
    # known portrait filenames take precedence
    for slug, filename in MANUAL.items():
        if (IMG / f"{slug}.jpg").exists():
            credits[slug] = {
                "artist": "Wikimedia Commons",
                "license": "见 Commons 文件页",
                "descriptionurl": commons_url("File:" + filename),
                "commons_title": "File:" + filename,
            }
    # only keep credits for files that actually exist; this also lets the UI
    # avoid issuing requests for absent images.
    credits = {k: v for k, v in credits.items() if (IMG / f"{k}.jpg").exists()}
    for p in IMG.glob("*.jpg"):
        slug = p.stem
        if slug in credits:
            continue
        credits[slug] = {
            "artist": "Wikimedia Commons / 公共历史档案",
            "license": "见 Commons 文件页",
            "descriptionurl": "https://commons.wikimedia.org/",
            "commons_title": "",
        }
    js = (
        "window.WW2 = window.WW2 || {};\n"
        "window.WW2.credits = "
        + json.dumps(credits, ensure_ascii=False, indent=2)
        + ";\n"
    )
    (ROOT / "js" / "credits.js").write_text(js, encoding="utf-8")
    (IMG / "credits.json").write_text(json.dumps(credits, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote credits for {len(credits)} images")


if __name__ == "__main__":
    main()
