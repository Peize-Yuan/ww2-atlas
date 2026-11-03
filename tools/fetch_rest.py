"""Fetch one Wikimedia Commons image per subject via the REST search endpoint,
download the original, resize locally, and build attribution data.

The REST endpoint is much faster than the Action API on this network; originals
download more reliably than generated thumbnails.
"""
from __future__ import annotations

import io
import json
import sys
import re
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "images"
CAND = ROOT / "_candidates"
OUT.mkdir(exist_ok=True)
CAND.mkdir(exist_ok=True)
UA = "WW2ArchiveBuilder/1.0 (local educational website)"

SUBJECTS = {
    "battle-poland": "Invasion of Poland 1939 German soldiers",
    "battle-france": "Battle of France 1940 German troops",
    "battle-britain": "Spitfire Battle of Britain 1940",
    "battle-barbarossa": "Operation Barbarossa 1941 German soldiers",
    "battle-moscow": "Battle of Moscow 1941 Soviet soldiers",
    "battle-pearl": "Pearl Harbor attack 1941 battleship",
    "battle-midway": "Battle of Midway 1942 aircraft carrier",
    "battle-stalingrad": "Battle of Stalingrad 1942 ruins",
    "battle-kursk": "Battle of Kursk 1943 tanks",
    "battle-elalamein": "El Alamein 1942 British tanks",
    "battle-normandy": "Normandy landings 1944 Omaha Beach",
    "battle-bagration": "Operation Bagration 1944 Soviet soldiers",
    "battle-iwojima": "Battle of Iwo Jima 1945 marines",
    "battle-berlin": "Battle of Berlin 1945 Soviet soldiers",
    "battle-okinawa": "Battle of Okinawa 1945",
    "battle-dunkirk": "Dunkirk evacuation 1940",
    "battle-guadalcanal": "Battle of Guadalcanal 1942 marines",
    "eq-t34": "T-34 tank Soviet 1943",
    "eq-tiger": "Tiger I tank 1943",
    "eq-sherman": "M4 Sherman tank 1944",
    "eq-panther": "Panther tank 1944",
    "eq-is2": "IS-2 tank 1945",
    "eq-spitfire": "Supermarine Spitfire 1940 flying",
    "eq-bf109": "Messerschmitt Bf 109 1940",
    "eq-p51": "P-51 Mustang 1944",
    "eq-zero": "Mitsubishi A6M Zero 1942",
    "eq-b17": "B-17 Flying Fortress 1943",
    "eq-il2": "Ilyushin Il-2 1943",
    "eq-me262": "Messerschmitt Me 262 1945",
    "eq-yamato": "Japanese battleship Yamato 1941",
    "eq-bismarck": "German battleship Bismarck 1940",
    "eq-enterprise": "USS Enterprise CV-6 1942",
    "eq-uboat": "Type VII U-boat 1941",
    "eq-mg42": "MG 42 machine gun",
    "eq-ppsh": "PPSh-41 submachine gun",
    "eq-katyusha": "Katyusha rocket launcher 1943",
    "eq-v2": "V-2 rocket 1945",
    "eq-enigma": "Enigma machine 1940",
    "person-roosevelt": "Franklin D Roosevelt portrait 1944",
    "person-churchill": "Winston Churchill portrait 1942",
    "person-stalin": "Joseph Stalin portrait 1943",
    "person-chiang": "Chiang Kai-shek portrait 1943",
    "person-degaulle": "Charles de Gaulle 1942",
    "person-hitler": "Adolf Hitler portrait 1939",
    "person-mussolini": "Benito Mussolini portrait 1940",
    "person-hirohito": "Emperor Hirohito 1941 portrait",
    "person-tojo": "Hideki Tojo 1941",
    "person-zhukov": "Georgy Zhukov 1945",
    "person-eisenhower": "Dwight Eisenhower 1944",
    "person-macarthur": "Douglas MacArthur 1944",
    "person-nimitz": "Chester Nimitz 1945",
    "person-montgomery": "Bernard Montgomery 1943",
    "person-patton": "George S Patton 1944",
    "person-rommel": "Erwin Rommel 1942",
    "person-guderian": "Heinz Guderian 1941",
    "person-yamamoto": "Isoroku Yamamoto 1940",
    "event-munich": "Munich Agreement 1938 Chamberlain Hitler",
    "event-ribbentrop": "Molotov Ribbentrop Pact signing 1939",
    "event-yalta": "Yalta Conference 1945",
    "event-holocaust": "Auschwitz liberation 1945",
    "event-hiroshima": "Hiroshima aftermath 1945",
    "event-nuremberg": "Nuremberg trials 1946",
    "event-trinity": "Trinity test 1945 Manhattan Project",
    "event-winterwar": "Winter War 1939 Finnish soldiers",
    "event-spain": "Spanish Civil War 1936",
    "event-lendlease": "Lend Lease World War II",
    "overview-iwoflag": "Raising the Flag on Iwo Jima",
    "overview-dday": "Into the Jaws of Death Normandy",
    "overview-homefront": "World War II home front factory women",
    "overview-surrender": "Japanese surrender USS Missouri 1945",
    "overview-victory": "Victory in Europe Day 1945",
    "overview-cover": "World War II soldiers battle",
}

BAD = re.compile(
    r"\b(map|maps|diagram|chart|flag|flags|insignia|logo|emblem|stamp|coin|medal|"
    r"banknote|poster|propaganda|cartoon|drawing|sketch|painting|scale|replica|"
    r"reconstruction|reenact|reenactment|memorial|grave|cemetery|statue|monument|"
    r"blueprint|schematic|order of battle|cover art|book cover|screenshot|film poster)\b",
    re.I,
)
GOOD = re.compile(
    r"(194[0-5]|193[5-9]|bundesarchiv|national archives|imperial war|us army|us navy|"
    r"marine|soldier|troop|tank|aircraft|plane|fighter|bomber|ship|battleship|portrait|"
    r"ruins|battle|landing|beach|convoy|gun|rifle|rocket|submarine|carrier|surrender|"
    r"conference|signing|liberation|holocaust|factory|home front|soviet|german|japanese|british|american)",
    re.I,
)


def request(url: str, timeout: int = 45) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json,image/*,*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def search(query: str) -> list[dict]:
    url = "https://commons.wikimedia.org/w/rest.php/v1/search/page?" + urllib.parse.urlencode(
        {"q": query, "limit": "5"}
    )
    for attempt in range(3):
        try:
            data = json.loads(request(url, 30).decode("utf-8"))
            return data.get("pages", [])
        except Exception as exc:
            if attempt == 2:
                print(f"SEARCH FAIL {query}: {exc}", flush=True)
            time.sleep(1.5 + attempt)
    return []


def score(page: dict, category: str) -> float:
    title = page.get("title", "")
    excerpt = re.sub(r"<[^>]+>", " ", page.get("excerpt", "") or "")
    s = 20 - min(8, page.get("index", 0))
    if BAD.search(title):
        s -= 45
    if GOOD.search(title):
        s += 5
    if category == "person":
        if re.search(r"(portrait|official|photograph|194[0-5])", title, re.I):
            s += 5
        if re.search(r"(with|and|meeting|conference|together|funeral|wedding)", title, re.I):
            s -= 5
    if category == "equipment":
        if re.search(r"(museum|restored|surviving|victory park|monument)", title, re.I):
            s -= 8
    if category == "battle":
        if re.search(r"(map|front|advance|situation)", title, re.I):
            s -= 10
    if category == "overview":
        s += 2 if re.search(r"(marines|soldiers|flag|surrender|normandy|victory)", title, re.I) else 0
    s += min(4, len(excerpt) / 120)
    return s


def original_from_thumb(thumb: str) -> str | None:
    thumb = thumb.split("?")[0]
    m = re.match(r"https://thumb\.wikimedia\.org/wikipedia/commons/thumb/(.+?)/\d+px-", thumb)
    if not m:
        return None
    return "https://upload.wikimedia.org/wikipedia/commons/" + m.group(1)


def choose(page: dict, query: str) -> str | None:
    thumb = (page.get("thumbnail") or {}).get("url")
    if not thumb:
        return None
    if (page.get("thumbnail") or {}).get("mimetype") not in ("image/jpeg", "image/png", "image/webp"):
        return None
    return original_from_thumb(thumb)


def download_subject(slug: str, query: str, force: bool = False) -> dict | None:
    target = OUT / f"{slug}.jpg"
    if target.exists() and not force:
        return {"slug": slug, "file": str(target.relative_to(ROOT)), "status": "existing", "query": query}
    pages = search(query)
    if not pages:
        return None
    category = slug.split("-")[0]
    pages = sorted(pages, key=lambda p: score(p, category), reverse=True)
    for page in pages:
        original = choose(page, query)
        if not original:
            continue
        try:
            filename = page.get("title", "").replace("File:", "", 1)
            special = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(filename)
            proxy = "https://wsrv.nl/?" + urllib.parse.urlencode({"url": special, "w": "1100", "output": "jpg", "q": "84", "we": "1"})
            raw = None
            for attempt in range(2):
                for src in (proxy, special + "?width=960"):
                    try:
                        raw = request(src, 38)
                        break
                    except Exception:
                        time.sleep(1.5)
                if raw is not None:
                    break
            if raw is None:
                continue
            if len(raw) > 30 * 1024 * 1024:
                continue
            im = Image.open(io.BytesIO(raw))
            im = ImageOps.exif_transpose(im)
            im = im.convert("RGB")
            if im.width > 1280:
                im = im.resize((1280, round(im.height * 1280 / im.width)), Image.Resampling.LANCZOS)
            im.save(target, "JPEG", quality=85, optimize=True)
            print(f"OK {slug} <- {page.get('title')} ({im.width}x{im.height})", flush=True)
            time.sleep(0.45)
            return {
                "slug": slug,
                "file": str(target.relative_to(ROOT)),
                "commons_title": page.get("title", ""),
                "descriptionurl": "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(page.get("title", "").replace(" ", "_")),
                "query": query,
                "width": im.width,
                "height": im.height,
                "status": "downloaded",
            }
        except Exception as exc:
            print(f"IMG FAIL {slug} {page.get('title')}: {exc}", flush=True)
            time.sleep(1)
    return {"slug": slug, "status": "failed"}


def main() -> None:
    argv = __import__("sys").argv
    force = "--force" in argv
    only = None
    if "--only" in argv:
        only = argv[argv.index("--only") + 1]
    results = []
    priority = {"eq": 0, "person": 1, "battle": 2, "event": 3, "overview": 4}
    ordered = sorted(SUBJECTS.items(), key=lambda kv: priority.get(kv[0].split("-")[0], 9))
    if only:
        ordered = [(slug, query) for slug, query in ordered if slug.startswith(only + "-")]
    with ThreadPoolExecutor(max_workers=2) as ex:
        futs = {ex.submit(download_subject, slug, query, force): slug for slug, query in ordered}
        for fut in as_completed(futs):
            slug = futs[fut]
            try:
                r = fut.result()
                if r:
                    results.append(r)
                    (CAND / "manifest_rest.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
            except Exception as exc:
                print(f"THREAD FAIL {slug}: {exc}", flush=True)

    # Build credits from Commons metadata in batches, then fall back gracefully.
    credits = {}
    titles = [r["commons_title"] for r in results if r.get("commons_title")]
    meta = {}
    for i in range(0, len(titles), 45):
        batch = titles[i:i + 45]
        params = {
            "action": "query", "format": "json", "prop": "imageinfo",
            "iiprop": "extmetadata|url", "titles": "|".join(batch)
        }
        url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
        for attempt in range(3):
            try:
                data = json.loads(request(url, 55).decode("utf-8"))
                for page in (data.get("query") or {}).get("pages", {}).values():
                    info = (page.get("imageinfo") or [{}])[0]
                    ext = info.get("extmetadata") or {}
                    meta[page.get("title", "")] = {
                        "artist": re.sub(r"<[^>]+>", "", (ext.get("Artist") or {}).get("value", "") or ""),
                        "license": re.sub(r"<[^>]+>", "", (ext.get("LicenseShortName") or {}).get("value", "") or ""),
                        "descriptionurl": info.get("descriptionurl", ""),
                    }
                break
            except Exception as exc:
                print(f"META FAIL batch {i}: {exc}", flush=True)
                time.sleep(2)

    for r in results:
        m = meta.get(r.get("commons_title", ""), {})
        credits[r["slug"]] = {
            "artist": m.get("artist", "Wikimedia Commons")[:140],
            "license": m.get("license", "见 Commons 文件页"),
            "descriptionurl": m.get("descriptionurl", r.get("descriptionurl", "")),
            "commons_title": r.get("commons_title", ""),
        }
    js = "window.WW2 = window.WW2 || {};\nwindow.WW2.credits = " + json.dumps(credits, ensure_ascii=False, indent=2) + ";\n"
    (ROOT / "js" / "credits.js").write_text(js, encoding="utf-8")
    (OUT / "credits.json").write_text(json.dumps(credits, ensure_ascii=False, indent=2), encoding="utf-8")

    # contact sheet
    items = [m for m in results if (ROOT / m["file"]).exists()]
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 16)
    except Exception:
        font = ImageFont.load_default()
    cols, tw, th, label_h = 5, 300, 190, 34
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * (th + label_h)), "#171512")
    draw = ImageDraw.Draw(sheet)
    for idx, item in enumerate(items):
        x = (idx % cols) * tw
        y = (idx // cols) * (th + label_h)
        try:
            im = Image.open(ROOT / item["file"]).convert("RGB")
            im.thumbnail((tw - 8, th - 8))
            sheet.paste(im, (x + 4, y + 4))
        except Exception:
            pass
        draw.text((x + 5, y + th + 3), item["slug"], fill="#f1e6ce", font=font)
    sheet.save(CAND / "sheet_rest.jpg", quality=85)
    print(f"DONE {len(items)}/{len(SUBJECTS)} images; sheet {sheet.size}", flush=True)


if __name__ == "__main__":
    main()
