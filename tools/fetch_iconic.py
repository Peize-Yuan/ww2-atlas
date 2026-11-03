"""Try a curated set of iconic, known Commons files for key visual moments."""
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

ITEMS = {
    "battle-normandy": ["Into the Jaws of Death 23-0455M edit.jpg", "Into the Jaws of Death 23-0455M.jpg"],
    "battle-berlin": ["Raising a flag over the Reichstag.jpg", "Raising a flag over the Reichstag 2.jpg"],
    "battle-midway": ["Japanese aircraft carrier Sōryū underway during Battle of Midway on 4 June 1942.jpg", "Japanese aircraft carrier Hiryū underway during Battle of Midway on 4 June 1942.jpg"],
    "overview-surrender": ["Japanese surrender on USS Missouri.jpg", "Surrender of Japan on USS Missouri.jpg"],
    "overview-victory": ["VE Day, Times Square, 1945.jpg", "Times Square V-J Day.jpg"],
    "event-yalta": ["Yalta Conference.jpg", "Yalta summit 1945.jpg"],
    "event-trinity": ["Trinity shot.jpg", "Trinity test.jpg"],
    "event-munich": ["Munich Agreement 1938.jpg", "Chamberlain Hitler Munich.jpg"],
    "event-ribbentrop": ["Molotov-Ribbentrop Pact.jpg", "Ribbentrop Molotov signing.jpg"],
    "event-nuremberg": ["Nuremberg trials.jpg", "Nuremberg Trial.jpg"],
}


def download(filename: str) -> bytes | None:
    special = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(filename)
    proxy = "https://wsrv.nl/?" + urllib.parse.urlencode({"url": special, "w": "1200", "output": "jpg", "q": "84", "we": "1"})
    for url, timeout in ((proxy, 45), (special + "?width=960", 25)):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "image/*"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except Exception as exc:
            print(f"  fail {filename[:55]}: {exc}", flush=True)
            time.sleep(1)
    return None


def main() -> None:
    for slug, names in ITEMS.items():
        for name in names:
            raw = download(name)
            if not raw:
                continue
            try:
                im = Image.open(io.BytesIO(raw))
                im = ImageOps.exif_transpose(im).convert("RGB")
                if im.width < 260 or im.height < 180:
                    continue
                if im.width > 1200:
                    im = im.resize((1200, round(im.height * 1200 / im.width)), Image.Resampling.LANCZOS)
                im.save(OUT / f"{slug}.jpg", "JPEG", quality=86, optimize=True)
                print(f"OK {slug} <- {name} ({im.width}x{im.height})", flush=True)
                break
            except Exception as exc:
                print(f"  invalid {name}: {exc}", flush=True)
        else:
            print(f"MISS {slug}", flush=True)


if __name__ == "__main__":
    main()
