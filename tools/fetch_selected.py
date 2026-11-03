"""Select one strong Wikimedia Commons photo per subject, download it via wsrv.nl,
and keep attribution metadata for the site."""
from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "images"
CAND = ROOT / "_candidates"
CAND.mkdir(exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
UA = "WW2ArchiveBuilder/1.0 (local educational website)"
FINAL_W = 1100

SUBJECTS = {
    # battles
    "battle-poland": ("battle", "Invasion of Poland 1939 German soldiers"),
    "battle-france": ("battle", "Battle of France 1940 German troops"),
    "battle-britain": ("battle", "Battle of Britain Spitfire 1940"),
    "battle-barbarossa": ("battle", "Operation Barbarossa 1941 German soldiers"),
    "battle-moscow": ("battle", "Battle of Moscow 1941 Soviet soldiers"),
    "battle-pearl": ("battle", "Attack on Pearl Harbor 1941 battleship"),
    "battle-midway": ("battle", "Battle of Midway 1942 aircraft carrier"),
    "battle-stalingrad": ("battle", "Battle of Stalingrad 1942 ruins"),
    "battle-kursk": ("battle", "Battle of Kursk 1943 tanks"),
    "battle-elalamein": ("battle", "Second Battle of El Alamein 1942"),
    "battle-normandy": ("battle", "Normandy landings 1944 Omaha Beach"),
    "battle-bagration": ("battle", "Operation Bagration 1944"),
    "battle-iwojima": ("battle", "Battle of Iwo Jima 1945 marines"),
    "battle-berlin": ("battle", "Battle of Berlin 1945"),
    "battle-okinawa": ("battle", "Battle of Okinawa 1945"),
    "battle-dunkirk": ("battle", "Dunkirk evacuation 1940"),
    "battle-guadalcanal": ("battle", "Battle of Guadalcanal 1942"),
    # equipment
    "eq-t34": ("equipment", "T-34 tank Soviet 1943"),
    "eq-tiger": ("equipment", "Tiger I tank 1943"),
    "eq-sherman": ("equipment", "M4 Sherman tank 1944"),
    "eq-panther": ("equipment", "Panther tank 1944"),
    "eq-is2": ("equipment", "IS-2 tank 1945"),
    "eq-spitfire": ("equipment", "Supermarine Spitfire 1940 flying"),
    "eq-bf109": ("equipment", "Messerschmitt Bf 109 1940"),
    "eq-p51": ("equipment", "P-51 Mustang 1944"),
    "eq-zero": ("equipment", "Mitsubishi A6M Zero 1942"),
    "eq-b17": ("equipment", "B-17 Flying Fortress 1943"),
    "eq-il2": ("equipment", "Ilyushin Il-2 1943"),
    "eq-me262": ("equipment", "Messerschmitt Me 262 1945"),
    "eq-yamato": ("equipment", "Japanese battleship Yamato 1941"),
    "eq-bismarck": ("equipment", "German battleship Bismarck 1940"),
    "eq-enterprise": ("equipment", "USS Enterprise CV-6 1942"),
    "eq-uboat": ("equipment", "Type VII U-boat 1941"),
    "eq-mg42": ("equipment", "MG 42 machine gun 1944"),
    "eq-ppsh": ("equipment", "PPSh-41 submachine gun"),
    "eq-katyusha": ("equipment", "Katyusha rocket launcher 1943"),
    "eq-v2": ("equipment", "V-2 rocket 1945"),
    "eq-enigma": ("equipment", "Enigma machine 1940"),
    # people
    "person-roosevelt": ("person", "Franklin D Roosevelt portrait 1944"),
    "person-churchill": ("person", "Winston Churchill portrait 1942"),
    "person-stalin": ("person", "Joseph Stalin portrait 1943"),
    "person-chiang": ("person", "Chiang Kai-shek portrait 1943"),
    "person-degaulle": ("person", "Charles de Gaulle 1942"),
    "person-hitler": ("person", "Adolf Hitler portrait 1939"),
    "person-mussolini": ("person", "Benito Mussolini portrait 1940"),
    "person-hirohito": ("person", "Emperor Hirohito 1941 portrait"),
    "person-tojo": ("person", "Hideki Tojo 1941"),
    "person-zhukov": ("person", "Georgy Zhukov 1945"),
    "person-eisenhower": ("person", "Dwight Eisenhower 1944"),
    "person-macarthur": ("person", "Douglas MacArthur 1944"),
    "person-nimitz": ("person", "Chester Nimitz 1945"),
    "person-montgomery": ("person", "Bernard Montgomery 1943"),
    "person-patton": ("person", "George S Patton 1944"),
    "person-rommel": ("person", "Erwin Rommel 1942"),
    "person-guderian": ("person", "Heinz Guderian 1941"),
    "person-yamamoto": ("person", "Isoroku Yamamoto 1940"),
    # events
    "event-munich": ("event", "Munich Agreement 1938 Chamberlain Hitler"),
    "event-ribbentrop": ("event", "Molotov Ribbentrop Pact signing 1939"),
    "event-yalta": ("event", "Yalta Conference 1945"),
    "event-holocaust": ("event", "Auschwitz liberation 1945"),
    "event-hiroshima": ("event", "Hiroshima aftermath 1945"),
    "event-nuremberg": ("event", "Nuremberg trials 1946"),
    "event-trinity": ("event", "Trinity test 1945 Manhattan Project"),
    "event-winterwar": ("event", "Winter War 1939 Finnish soldiers"),
    "event-spain": ("event", "Spanish Civil War 1936"),
    "event-lendlease": ("event", "Lend Lease World War II"),
    # overview
    "overview-iwoflag": ("overview", "Raising the Flag on Iwo Jima"),
    "overview-dday": ("overview", "Into the Jaws of Death Normandy"),
    "overview-homefront": ("overview", "World War II home front factory women"),
    "overview-surrender": ("overview", "Japanese surrender USS Missouri 1945"),
    "overview-victory": ("overview", "Victory in Europe Day 1945"),
    "overview-cover": ("overview", "World War II montage"),
}

BAD = re.compile(
    r"\b(map|maps|plan|diagram|chart|flag|flags|insignia|logo|emblem|stamp|coin|medal|"
    r"banknote|poster|propaganda|cartoon|drawing|sketch|painting|model|scale|replica|"
    r"reconstruction|reenact|reenactment|memorial|grave|cemetery|statue|monument|"
    r"today|modern|museum|blueprint|schematic|order of battle|cover art|book)\b",
    re.I,
)
GOOD_CONTEXT = re.compile(
    r"(194[0-5]|193[5-9]|bundesarchiv|national archives|imperial war|us army|us navy|"
    r"marine|soldier|troop|tank|aircraft|plane|fighter|bomber|ship|battleship|portrait|"
    r"ruins|battle|landing|beach|convoy|gun|rifle|rocket|submarine|carrier|surrender|"
    r"conference|signing|liberation|holocaust|factory|home front)",
    re.I,
)


def api(params: dict) -> dict:
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    last = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=55) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            last = exc
            time.sleep(1.5 + attempt)
    raise last  # type: ignore[misc]


def clean(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text or "")
    return re.sub(r"\s+", " ", text).strip()


def score(page: dict, category: str) -> float:
    title = page.get("title", "")
    info = (page.get("imageinfo") or [{}])[0]
    s = 20 - page.get("index", 99)
    if BAD.search(title):
        s -= 40
    if GOOD_CONTEXT.search(title):
        s += 4
    w, h = info.get("width") or 0, info.get("height") or 0
    if w >= 900:
        s += 2
    if h and w / h > 2.2:
        s -= 2
    if category == "person":
        if re.search(r"(portrait|official|photograph|194[0-5])", title, re.I):
            s += 4
        if re.search(r"(with|and|meeting|conference|together)", title, re.I):
            s -= 3
    if category == "equipment":
        if re.search(r"(restored|surviving|museum)", title, re.I):
            s -= 6
    return s


def download_via_proxy(original: str, target: Path) -> None:
    original = original.split("?")[0]
    proxy = "https://wsrv.nl/?" + urllib.parse.urlencode(
        {"url": original, "w": str(FINAL_W), "output": "jpg", "q": "84", "we": "1"}
    )
    for attempt in range(4):
        try:
            req = urllib.request.Request(proxy, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=75) as resp:
                target.write_bytes(resp.read())
            return
        except Exception:
            time.sleep(2 + attempt)
    raise RuntimeError(f"download failed: {original}")


def main() -> None:
    manifest = []
    for slug, (category, query) in SUBJECTS.items():
        params = {
            "action": "query",
            "format": "json",
            "generator": "search",
            "gsrsearch": f"filetype:bitmap {query}",
            "gsrnamespace": "6",
            "gsrlimit": "8",
            "prop": "imageinfo",
            "iiprop": "url|extmetadata|size",
            "iiurlwidth": "1280",
        }
        try:
            data = api(params)
        except Exception as exc:
            print(f"SEARCH FAIL {slug}: {exc}", flush=True)
            continue
        pages = list((data.get("query") or {}).get("pages", {}).values())
        if not pages:
            print(f"NO RESULTS {slug}", flush=True)
            continue
        pages.sort(key=lambda p: score(p, category), reverse=True)
        chosen = None
        for page in pages:
            info = (page.get("imageinfo") or [{}])[0]
            if info.get("url") and info.get("width", 0) >= 550:
                chosen = page
                break
        if not chosen:
            chosen = pages[0]
        info = (chosen.get("imageinfo") or [{}])[0]
        original = info.get("url", "")
        if not original:
            print(f"NO URL {slug}", flush=True)
            continue
        target = OUT / f"{slug}.jpg"
        try:
            if not target.exists():
                download_via_proxy(original, target)
        except Exception as exc:
            print(f"DOWNLOAD FAIL {slug}: {exc}", flush=True)
            continue
        meta = info.get("extmetadata") or {}
        manifest.append(
            {
                "slug": slug,
                "category": category,
                "query": query,
                "file": f"assets/images/{slug}.jpg",
                "commons_title": chosen.get("title", ""),
                "descriptionurl": info.get("descriptionurl", ""),
                "license": clean((meta.get("LicenseShortName") or {}).get("value", "")),
                "artist": clean((meta.get("Artist") or {}).get("value", "")),
                "credit": clean((meta.get("Credit") or {}).get("value", "")),
                "width": info.get("width"),
                "height": info.get("height"),
            }
        )
        print(f"OK {slug}: {chosen.get('title')}", flush=True)
        (CAND / "manifest_selected.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        time.sleep(0.25)

    (OUT / "credits.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # Build a contact sheet of selected assets for visual QA
    items = [m for m in manifest if (ROOT / m["file"]).exists()]
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 17)
    except Exception:
        font = ImageFont.load_default()
    cols, tw, th, label_h = 5, 310, 190, 38
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
        draw.text((x + 5, y + th + 2), item["slug"], fill="#f1e6ce", font=font)
    sheet.save(CAND / "sheet_selected.jpg", quality=88)
    print(f"DONE {len(manifest)} images; sheet {sheet.size}", flush=True)


if __name__ == "__main__":
    main()
