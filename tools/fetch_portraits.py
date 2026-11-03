"""Replace ambiguous/group portraits with specific, known Commons portrait files."""
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
OUT.mkdir(exist_ok=True)
UA = "WW2ArchiveBuilder/1.0 (local educational website)"
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

CANDIDATES = {
    "person-chiang": ["Chiang Kai-shek（蔣中正）.jpg", "Chiang Kai-shek, 1943.jpg", "Chiang Kai-shek.jpg", "Generalissimo Chiang Kai-shek, 1943.jpg"],
    "person-hitler": ["Adolf Hitler cropped restored.jpg", "Adolf Hitler 1938 portrait.jpg", "Hitler portrait crop.jpg"],
    "person-hirohito": ["Hirohito in dress uniform.jpg", "Emperor Hirohito in 1941.jpg", "Hirohito 1941.jpg"],
    "person-macarthur": ["DouglasMacArthur.jpg", "Douglas MacArthur.jpg"],
    "person-mussolini": ["Benito Mussolini colored.jpg", "Benito mussolini (cropped).jpg", "Duce Benito Mussolini.jpg"],
    "person-nimitz": ["Chester Nimitz 1945.jpg", "Chester W. Nimitz.jpg", "Chester Nimitz as CINCPAC.jpg"],
    "person-patton": ["George S. Patton.jpg", "George S. Patton, 1944.jpg", "Patton 1944.jpg"],
    "person-tojo": ["Hideki Tojo 2.jpg", "Hideki Tojo.jpg", "Hideki Tojo 1941.jpg"],
    "person-zhukov": ["Zhukov-LIFE-1944-1945 cropped.jpg", "Zhukov-LIFE-1944-1945.jpg"],
    "person-eisenhower": ["Dwight D. Eisenhower as General of the Army crop.jpg", "Dwight Eisenhower, 1945.jpg"],
    "person-degaulle": ["De Gaulle-OWI-2.jpg", "De Gaulle-OWI (cropped)-(c).jpg"],
    "person-rommel": ["Bundesarchiv Bild 146-1977-018-13A, Erwin Rommel(brighter).jpg"],
    "person-guderian": ["Bundesarchiv Bild 101I-139-1112-17, Heinz Guderian.jpg", "Heinz Guderian 1941.jpg"],
    "person-yamamoto": ["Isoroku Yamamoto, 1940.jpg", "Yamamoto Isoroku.jpg", "Isoroku Yamamoto.jpg"],
}


def download(filename: str) -> bytes | None:
    special = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(filename)
    proxy = "https://wsrv.nl/?" + urllib.parse.urlencode({"url": special, "w": "960", "output": "jpg", "q": "84", "we": "1"})
    for url, timeout in ((proxy, 45), (special + "?width=960", 28)):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "image/*"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except Exception as exc:
            print(f"  fail {filename[:50]}: {exc}", flush=True)
            time.sleep(1)
    return None


def main() -> None:
    credits = {}
    for slug, names in CANDIDATES.items():
        target = OUT / f"{slug}.jpg"
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
                break
            except Exception as exc:
                print(f"  invalid {name}: {exc}", flush=True)
        else:
            print(f"MISS {slug}", flush=True)
    (ROOT / "_candidates" / "portrait_credits.json").write_text(json.dumps(credits, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
