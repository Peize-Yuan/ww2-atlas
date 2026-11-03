"""Fetch candidate Wikimedia Commons images for the WWII archive."""
from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "_candidates"
OUT.mkdir(exist_ok=True)
UA = "WW2ArchiveBuilder/1.0 (local educational website; contact: none)"

QUERIES = {
    "battles": {
        "poland": "Invasion of Poland 1939 German soldiers",
        "france": "Battle of France 1940 German troops",
        "britain": "Battle of Britain Spitfire 1940",
        "barbarossa": "Operation Barbarossa 1941 German soldiers",
        "moscow": "Battle of Moscow 1941 Soviet soldiers",
        "pearl": "Attack on Pearl Harbor 1941",
        "midway": "Battle of Midway 1942",
        "stalingrad": "Battle of Stalingrad 1942 ruins",
        "kursk": "Battle of Kursk 1943 tanks",
        "elalamein": "Second Battle of El Alamein 1942",
        "normandy": "Normandy landings 1944 Omaha Beach",
        "bagration": "Operation Bagration 1944",
        "iwojima": "Battle of Iwo Jima 1945",
        "berlin": "Battle of Berlin 1945",
        "okinawa": "Battle of Okinawa 1945",
        "dunkirk": "Dunkirk evacuation 1940",
        "guadalcanal": "Battle of Guadalcanal 1942",
    },
    "equipment": {
        "t34": "T-34 tank Soviet 1943",
        "tiger": "Tiger I tank 1943",
        "sherman": "M4 Sherman tank 1944",
        "panther": "Panther tank 1944",
        "is2": "IS-2 tank 1945",
        "spitfire": "Supermarine Spitfire flying 1940",
        "bf109": "Messerschmitt Bf 109 1940",
        "p51": "P-51 Mustang 1944",
        "zero": "Mitsubishi A6M Zero 1942",
        "b17": "B-17 Flying Fortress formation",
        "il2": "Ilyushin Il-2 1943",
        "me262": "Messerschmitt Me 262 1945",
        "yamato": "Japanese battleship Yamato 1941",
        "bismarck": "German battleship Bismarck 1940",
        "enterprise": "USS Enterprise CV-6 1942",
        "uboat": "Type VII U-boat 1941",
        "mg42": "MG 42 machine gun",
        "ppsh": "PPSh-41 submachine gun",
        "katyusha": "Katyusha rocket launcher 1943",
        "v2": "V-2 rocket 1945",
        "enigma": "Enigma machine 1940",
        "garand": "M1 Garand rifle",
    },
    "people": {
        "roosevelt": "Franklin D Roosevelt 1944 portrait",
        "churchill": "Winston Churchill 1942 portrait",
        "stalin": "Joseph Stalin 1943 portrait",
        "chiang": "Chiang Kai-shek 1943",
        "degaulle": "Charles de Gaulle 1942",
        "hitler": "Adolf Hitler 1939 portrait",
        "mussolini": "Benito Mussolini 1940",
        "hirohito": "Emperor Hirohito 1941",
        "tojo": "Hideki Tojo 1941",
        "zhukov": "Georgy Zhukov 1945",
        "eisenhower": "Dwight Eisenhower 1944",
        "macarthur": "Douglas MacArthur 1944",
        "nimitz": "Chester Nimitz 1945",
        "montgomery": "Bernard Montgomery 1943",
        "patton": "George S Patton 1944",
        "rommel": "Erwin Rommel 1942",
        "guderian": "Heinz Guderian 1941",
        "yamamoto": "Isoroku Yamamoto 1940",
    },
    "events": {
        "munich": "Munich Agreement 1938 Chamberlain Hitler",
        "ribbentrop": "Molotov Ribbentrop Pact signing 1939",
        "yalta": "Yalta Conference 1945",
        "holocaust": "Auschwitz liberation 1945",
        "hiroshima": "Hiroshima aftermath 1945",
        "nuremberg": "Nuremberg trials 1946",
        "trinity": "Trinity test 1945 Manhattan Project",
        "winterwar": "Winter War 1939 Finnish soldiers",
        "spain": "Spanish Civil War 1936",
        "lendlease": "Lend Lease World War II",
        "tehran": "Tehran Conference 1943",
        "wannsee": "Wannsee Conference",
    },
    "overview": {
        "cover": "World War II montage",
        "iwoflag": "Raising the Flag on Iwo Jima",
        "dday": "Into the Jaws of Death Normandy",
        "homefront": "World War II home front factory women",
        "surrender": "Japanese surrender USS Missouri 1945",
        "victory": "Victory in Europe Day 1945",
    },
}


def api(params: dict) -> dict:
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def clean(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text or "")
    return re.sub(r"\s+", " ", text).strip()


def main() -> None:
    manifest = []
    for category, queries in QUERIES.items():
        for slug, query in queries.items():
            params = {
                "action": "query",
                "format": "json",
                "generator": "search",
                "gsrsearch": f"filetype:bitmap {query}",
                "gsrnamespace": "6",
                "gsrlimit": "5",
                "prop": "imageinfo",
                "iiprop": "url|extmetadata|size",
                "iiurlwidth": "1000",
            }
            try:
                data = api(params)
            except Exception as exc:
                print(f"FAIL {category}/{slug}: {exc}")
                continue
            pages = list((data.get("query") or {}).get("pages", {}).values())
            pages.sort(key=lambda p: p.get("index", 99))
            for i, page in enumerate(pages[:5]):
                info = (page.get("imageinfo") or [{}])[0]
                thumb = info.get("thumburl")
                if not thumb:
                    continue
                filename = f"{category}_{slug}_{i}.jpg"
                target = OUT / filename
                if not target.exists():
                    try:
                        req = urllib.request.Request(thumb, headers={"User-Agent": UA})
                        with urllib.request.urlopen(req, timeout=60) as resp:
                            target.write_bytes(resp.read())
                    except Exception as exc:
                        print(f"IMG FAIL {filename}: {exc}")
                        continue
                meta = info.get("extmetadata") or {}
                manifest.append(
                    {
                        "file": filename,
                        "category": category,
                        "slug": slug,
                        "query": query,
                        "title": clean(page.get("title", "")),
                        "descriptionurl": info.get("descriptionurl", ""),
                        "thumburl": thumb,
                        "license": clean((meta.get("LicenseShortName") or {}).get("value", "")),
                        "artist": clean((meta.get("Artist") or {}).get("value", "")),
                        "width": info.get("width"),
                        "height": info.get("height"),
                    }
                )
            print(f"OK {category}/{slug}: {len(pages)} results")
            time.sleep(0.12)
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    # Contact sheets
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 18)
    except Exception:
        font = ImageFont.load_default()
    for category in QUERIES:
        items = [m for m in manifest if m["category"] == category and (OUT / m["file"]).exists()]
        if not items:
            continue
        cols, tw, th, label_h = 4, 360, 220, 48
        rows = (len(items) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * tw, rows * (th + label_h)), "#171512")
        draw = ImageDraw.Draw(sheet)
        for idx, item in enumerate(items):
            x = (idx % cols) * tw
            y = (idx // cols) * (th + label_h)
            try:
                im = Image.open(OUT / item["file"]).convert("RGB")
                im.thumbnail((tw - 8, th - 8))
                sheet.paste(im, (x + 4, y + 4))
            except Exception:
                pass
            draw.text((x + 5, y + th + 2), item["file"], fill="#f1e6ce", font=font)
            draw.text((x + 5, y + th + 23), item["query"][:42], fill="#b9a987", font=font)
        sheet.save(OUT / f"sheet_{category}.jpg", quality=86)
        print(f"SHEET {category}: {sheet.size}")


if __name__ == "__main__":
    main()
