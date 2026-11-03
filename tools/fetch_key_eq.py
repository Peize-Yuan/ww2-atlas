"""Download selected key equipment photos from Commons via wsrv proxy."""
from __future__ import annotations

import io
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "images"
UA = "WW2ArchiveBuilder/1.0 (local educational website)"
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

ITEMS = {
    "eq-t34": ["T-34 Tank History Museum (81-37).jpg", "Tank T-34.JPG"],
    "eq-spitfire": ["602sqdn-spit1.jpg", "Supermarine Spitfire Mk Vb of No. 92 Squadron, 19 May 1941. This aircraft, serial R6923, was shot down by a Messerschmitt Bf 109 on 22 June 1941. CH2929.jpg"],
    "eq-yamato": ["Japanese battleship Yamato running trials in Sukumo Bay, 30 October 1941 (80-G-704702).jpg", "Yamato battleship.jpg"],
    "eq-b17": ["B17-F-45-VE (cropped).jpg", "B-17 Pluto.jpg"],
    "eq-zero": ["Mitsubishi A6M Zero (51647888314).jpg", "Mitsubishi A6M Zero (51646401427).jpg"],
    "eq-il2": ["Ilyushin IL-2 Sturmovik at Central Air Force Museum Monino pic1 a.jpg", "Restored Ilyushin IL-2.jpg"],
    "eq-me262": ["Messerschmitt Me 262.jpg", "Messerschmitt Me 262 FE-108.jpg"],
    "eq-uboat": ["Bundesarchiv Bild 101II-MW-1031-28, Lorient, U-31.jpg"],
}


def download(filename: str) -> bytes | None:
    special = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(filename)
    proxy = "https://wsrv.nl/?" + urllib.parse.urlencode({"url": special, "w": "1100", "output": "jpg", "q": "84", "we": "1"})
    for url, timeout in ((proxy, 42), (special + "?width=960", 28)):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "image/*"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except Exception as exc:
            print(f"  fail {filename[:55]}: {exc}", flush=True)
            time.sleep(1)
    return None


def main() -> None:
    credits = {}
    for slug, names in ITEMS.items():
        for name in names:
            raw = download(name)
            if not raw:
                continue
            try:
                im = Image.open(io.BytesIO(raw))
                im = ImageOps.exif_transpose(im).convert("RGB")
                if im.width < 280 or im.height < 200:
                    continue
                if im.width > 1200:
                    im = im.resize((1200, round(im.height * 1200 / im.width)), Image.Resampling.LANCZOS)
                im.save(OUT / f"{slug}.jpg", "JPEG", quality=86, optimize=True)
                credits[slug] = {
                    "artist": "Wikimedia Commons",
                    "license": "见 Commons 文件页",
                    "descriptionurl": "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(name.replace(" ", "_")),
                    "commons_title": "File:" + name,
                }
                print(f"OK {slug} <- {name} ({im.width}x{im.height})", flush=True)
                break
            except Exception as exc:
                print(f"  invalid {name}: {exc}", flush=True)
        else:
            print(f"MISS {slug}", flush=True)
    (ROOT / "_candidates" / "equipment_credits.json").write_text(json.dumps(credits, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
