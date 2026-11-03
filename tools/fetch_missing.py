"""Fetch the remaining battle/equipment/person/event images from Commons.

Uses the REST search endpoint (fast on this network) and the wsrv image proxy.
"""
from __future__ import annotations

import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "images"
CAND = ROOT / "_candidates"
CAND.mkdir(exist_ok=True)
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

UA = "WW2ArchiveBuilder/1.0 (local educational website)"

SUBJECTS = {
    "battle-shanghai": "Battle of Shanghai 1937 Chinese soldiers",
    "battle-elalamein": "Second Battle of El Alamein 1942 British tanks",
    "battle-okinawa": "Battle of Okinawa 1945 US Marines",
    "battle-dunkirk": "Dunkirk evacuation 1940 soldiers beach",
    "battle-guadalcanal": "Battle of Guadalcanal 1942 US Marines",
    "eq-is2": "IS-2 tank 1945",
    "eq-bf109": "Messerschmitt Bf 109 1940",
    "eq-p51": "North American P-51 Mustang 1944",
    "eq-zero": "Mitsubishi A6M Zero 1942",
    "eq-bismarck": "German battleship Bismarck 1940",
    "eq-enterprise": "USS Enterprise CV-6 1942",
    "eq-uboat": "German Type VII U-boat 1941",
    "eq-mg42": "MG 42 machine gun 1944",
    "eq-ppsh": "PPSh-41 submachine gun",
    "eq-katyusha": "Katyusha rocket launcher 1943",
    "eq-v2": "V-2 rocket 1945",
    "eq-enigma": "Enigma machine 1940",
    "event-nanjing": "Nanjing Massacre Memorial Hall",
    "event-munich": "Munich Agreement 1938 signing Chamberlain Hitler",
    "event-ribbentrop": "Molotov Ribbentrop Pact signing 1939",
    "event-winterwar": "Finnish soldiers Winter War 1939",
    "event-spain": "Spanish Civil War 1936 soldiers",
    "event-lendlease": "Lend Lease World War II aircraft",
    "event-holocaust": "Auschwitz Birkenau main gate",
    "event-yalta": "Yalta Conference 1945 Churchill Roosevelt Stalin",
    "event-trinity": "Trinity test 1945 mushroom cloud",
    "event-hiroshima": "Hiroshima Peace Memorial atomic bomb dome",
    "event-nuremberg": "Nuremberg trials 1946 defendants",
    "person-yamamoto": "Isoroku Yamamoto portrait",
}

FIXED = {
    "person-yamamoto": [
        "Isoroku Yamamoto, 1940.jpg",
        "Yamamoto Isoroku.jpg",
        "Isoroku Yamamoto.jpg",
        "Japanese Admiral Isoroku Yamamoto.jpg",
    ],
}

BAD = re.compile(
    r"\b(map|maps|diagram|chart|flag|flags|insignia|logo|emblem|stamp|coin|medal|"
    r"banknote|poster|propaganda|cartoon|drawing|sketch|painting|scale|replica|"
    r"reconstruction|reenact|reenactment|grave|cemetery|statue|monument|"
    r"blueprint|schematic|order of battle|cover art|book cover|screenshot|"
    r"corpse|corpses|bodies|dead body|execution|executions|warcrime|war crime|atrocity)\b",
    re.I,
)
GOOD = re.compile(
    r"(194[0-5]|193[6-9]|bundesarchiv|national archives|imperial war|us army|us navy|"
    r"marine|soldier|troop|tank|aircraft|plane|fighter|bomber|ship|battleship|portrait|"
    r"ruins|battle|landing|beach|convoy|gun|rifle|rocket|submarine|carrier|surrender|"
    r"conference|signing|liberation|holocaust|factory|memorial|gate|trial|atomic|"
    r"soviet|german|japanese|british|american|finnish|chinese)",
    re.I,
)


def request(url: str, timeout: int = 40) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json,image/*,*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def search(query: str) -> list[dict]:
    params = {
        "action": "query", "format": "json", "generator": "search",
        "gsrsearch": f"filetype:bitmap {query}", "gsrnamespace": "6", "gsrlimit": "7",
        "prop": "imageinfo", "iiprop": "url|size|mime", "iiurlwidth": "960"
    }
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    for attempt in range(3):
        try:
            data = json.loads(request(url, 25).decode("utf-8"))
            pages = list((data.get("query") or {}).get("pages", {}).values())
            pages.sort(key=lambda p: p.get("index", 99))
            return pages
        except Exception as exc:
            if attempt == 2:
                print(f"SEARCH FAIL {query}: {str(exc)[:80]}", flush=True)
            time.sleep(1.2 + attempt)
    return []


def score(page: dict, group: str) -> float:
    title = page.get("title", "")
    excerpt = re.sub(r"<[^>]+>", " ", page.get("excerpt", "") or "")
    s = 20 - min(8, page.get("index", 0))
    if BAD.search(title):
        s -= 50
    if GOOD.search(title):
        s += 6
    if group == "person":
        if re.search(r"(portrait|official|photograph|194[0-5])", title, re.I):
            s += 5
        if re.search(r"(with|and|meeting|conference|together|family)", title, re.I):
            s -= 6
    if group == "eq":
        if re.search(r"(museum|restored|surviving|memorial)", title, re.I):
            s -= 4
    if group == "event":
        if re.search(r"(memorial|conference|signing|trial|gate|test|dome)", title, re.I):
            s += 3
    s += min(4, len(excerpt) / 140)
    return s


def original_url(filename: str) -> str:
    return "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(filename)


def download_file(filename: str, thumb: str | None = None) -> bytes | None:
    special = original_url(filename)
    proxy = "https://wsrv.nl/?" + urllib.parse.urlencode(
        {"url": special, "w": "1100", "output": "jpg", "q": "84", "we": "1"}
    )
    urls = []
    if thumb:
        urls.append((thumb, 22))
    urls.extend([(special + "?width=960", 18), (proxy, 26)])
    for url, timeout in urls:
        try:
            return request(url, timeout)
        except Exception:
            time.sleep(0.4)
    return None


def fetch(slug: str, query: str) -> dict | None:
    target = OUT / f"{slug}.jpg"
    if target.exists():
        return {"slug": slug, "status": "existing"}
    group = slug.split("-")[0]
    pages = search(query)
    if not pages and slug in FIXED:
        pages = [{"title": "File:" + name, "index": 0, "thumbnail": {"url": "x"}} for name in FIXED[slug]]
    pages = sorted(pages, key=lambda p: score(p, group), reverse=True)
    for page in pages:
        title = page.get("title", "")
        if not title.startswith("File:"):
            continue
        if BAD.search(title):
            continue
        info = (page.get("imageinfo") or [{}])[0]
        thumb = info.get("thumburl") or info.get("url")
        raw = download_file(title[5:], thumb)
        if not raw:
            continue
        try:
            im = Image.open(io.BytesIO(raw))
            im = ImageOps.exif_transpose(im).convert("RGB")
            if im.width < 260 or im.height < 180:
                continue
            if im.width > 1200:
                im = im.resize((1200, round(im.height * 1200 / im.width)), Image.Resampling.LANCZOS)
            im.save(target, "JPEG", quality=86, optimize=True)
            print(f"OK {slug} <- {title} ({im.width}x{im.height})", flush=True)
            return {
                "slug": slug,
                "status": "downloaded",
                "commons_title": title,
                "descriptionurl": "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_")),
                "width": im.width,
                "height": im.height,
            }
        except Exception as exc:
            print(f"INVALID {slug} {title}: {str(exc)[:80]}", flush=True)
    print(f"MISS {slug}", flush=True)
    return {"slug": slug, "status": "failed"}


def main() -> None:
    results = []
    with ThreadPoolExecutor(max_workers=3) as ex:
        futs = {ex.submit(fetch, slug, query): slug for slug, query in SUBJECTS.items()}
        for fut in as_completed(futs):
            try:
                r = fut.result()
                if r:
                    results.append(r)
                    (CAND / "missing_manifest.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
            except Exception as exc:
                print(f"THREAD FAIL {futs[fut]}: {str(exc)[:100]}", flush=True)
    print(f"DONE {len([r for r in results if r.get('status') == 'downloaded'])} downloaded", flush=True)


if __name__ == "__main__":
    main()
