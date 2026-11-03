"""Overwrite a few ambiguous images with specific, verified Commons files."""
from __future__ import annotations

import io
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

FILES = {
    "battle-shanghai": "Chinese soldiers guarding Shanghai International Settlement - Battle of Shanghai (1937).png",
    "battle-dunkirk": "Dunkirk 1940 HU1137.jpg",
    "battle-okinawa": "Marine-assault-okinawa-1945.jpg",
    "battle-guadalcanal": "U.S. Marines storm ashore on Guadalcanal, 7 August 1942 (80-CF-112-5-3).jpg",
    "eq-is2": "IS-2 01.jpg",
    "eq-zero": "Mitsubishi A6M Zero X-133 in flight at PCDM 2009.JPG",
    "eq-katyusha": "Katyusha Rocket Launcher - Artillery Museum - St. Petersburg - Russia.jpg",
}


def get(filename: str) -> bytes | None:
    special = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(filename)
    proxy = "https://wsrv.nl/?" + urllib.parse.urlencode({"url": special, "w": "1100", "output": "jpg", "q": "84", "we": "1"})
    for url, timeout in ((special + "?width=960", 25), (proxy, 30)):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=timeout).read()
        except Exception as exc:
            print(f"  fail {filename[:55]}: {str(exc)[:70]}", flush=True)
            time.sleep(1)
    return None


def main() -> None:
    for slug, name in FILES.items():
        raw = get(name)
        if not raw:
            print("MISS", slug, flush=True)
            continue
        try:
            im = Image.open(io.BytesIO(raw))
            im = ImageOps.exif_transpose(im).convert("RGB")
            if im.width > 1200:
                im = im.resize((1200, round(im.height * 1200 / im.width)), Image.Resampling.LANCZOS)
            im.save(OUT / f"{slug}.jpg", "JPEG", quality=86, optimize=True)
            print("OK", slug, name, im.size, flush=True)
        except Exception as exc:
            print("INVALID", slug, str(exc)[:80], flush=True)


if __name__ == "__main__":
    main()
