"""Fetch or clear remaining ambiguous portraits."""
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

CANDIDATES = {
    "person-degaulle": ["De Gaulle-OWI-2.jpg", "De Gaulle-OWI (cropped)-(c).jpg"],
    "person-zhukov": ["Zhukov-LIFE-1944-1945 cropped.jpg", "Zhukov-LIFE-1944-1945.jpg"],
    "person-eisenhower": ["Dwight D. Eisenhower as General of the Army crop.jpg", "General Dwight D. Eisenhower.jpg", "Dwight D. Eisenhower, 1945.jpg", "Eisenhower 1945.jpg"],
    "person-tojo": ["Hideki Tojo, 1941.jpg", "Hideki Tojo official portrait.jpg", "Tojo Hideki.jpg", "Hideki Tojo 1941.jpg"],
    "person-nimitz": ["Fleet Admiral Chester W. Nimitz.jpg", "Chester W. Nimitz, 1945.jpg", "Chester Nimitz, USN.jpg", "Nimitz 1945.jpg"],
    "person-rommel": ["Bundesarchiv Bild 146-1977-018-13A, Erwin Rommel(brighter).jpg"],
    "person-guderian": ["Bundesarchiv Bild 101I-139-1112-17, Heinz Guderian.jpg", "Heinz Guderian 1941.jpg"],
    "person-yamamoto": ["Isoroku Yamamoto, 1940.jpg", "Yamamoto Isoroku.jpg", "Isoroku Yamamoto.jpg"],
}
DELETE_IF_MISS = {"person-eisenhower", "person-tojo", "person-nimitz", "person-degaulle", "person-zhukov"}


def download(filename: str) -> bytes | None:
    special = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(filename)
    proxy = "https://wsrv.nl/?" + urllib.parse.urlencode({"url": special, "w": "960", "output": "jpg", "q": "84", "we": "1"})
    for url, timeout in ((proxy, 38), (special + "?width=960", 24)):
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
    for slug, names in CANDIDATES.items():
        target = OUT / f"{slug}.jpg"
        ok = False
        for name in names:
            raw = download(name)
            if not raw:
                continue
            try:
                im = Image.open(io.BytesIO(raw))
                im = ImageOps.exif_transpose(im).convert("RGB")
                if im.width < 240 or im.height < 240:
                    continue
                if im.width > 1100:
                    im = im.resize((1100, round(im.height * 1100 / im.width)), Image.Resampling.LANCZOS)
                im.save(target, "JPEG", quality=86, optimize=True)
                credits[slug] = {
                    "artist": "Wikimedia Commons",
                    "license": "见 Commons 文件页",
                    "descriptionurl": "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(name.replace(" ", "_")),
                    "commons_title": "File:" + name,
                }
                print(f"OK {slug} <- {name} ({im.width}x{im.height})", flush=True)
                ok = True
                break
            except Exception as exc:
                print(f"  invalid {name}: {exc}", flush=True)
        if not ok:
            print(f"MISS {slug}", flush=True)
            if slug in DELETE_IF_MISS and target.exists():
                target.unlink()
                print(f"  removed ambiguous {slug}", flush=True)
    (ROOT / "_candidates" / "portrait_credits2.json").write_text(json.dumps(credits, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
