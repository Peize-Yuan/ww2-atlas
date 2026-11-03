/* ============================================================
   WAR ARCHIVE — schematic wartime situation board
   Dot-grid map generated from Natural Earth 110m.
   ============================================================ */
window.SituationMap = (() => {
  "use strict";
  let canvas, ctx, baseCanvas, baseCtx, w = 0, h = 0, dpr = 1;
  let year = 1942;
  let running = true;
  let raf = 0;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const AXIS = {
    1939: ["DEU", "ITA", "JPN", "AUT", "CZE", "SVK", "LBY", "ALB", "ERI", "SOM", "KOR", "TWN"],
    1940: ["DEU", "ITA", "JPN", "AUT", "CZE", "SVK", "HUN", "ROU", "BGR", "LBY", "ALB", "ERI", "SOM", "KOR", "TWN", "DNK", "NOR", "NLD", "BEL", "LUX"],
    1941: ["DEU", "ITA", "JPN", "AUT", "CZE", "SVK", "HUN", "ROU", "BGR", "FIN", "HRV", "LBY", "ALB", "KOR", "TWN", "THA"],
    1942: ["DEU", "ITA", "JPN", "AUT", "CZE", "SVK", "HUN", "ROU", "BGR", "FIN", "HRV", "LBY", "ALB", "KOR", "TWN", "THA"],
    1943: ["DEU", "JPN", "AUT", "CZE", "SVK", "HUN", "ROU", "BGR", "FIN", "HRV", "ALB", "KOR", "TWN", "THA"],
    1944: ["DEU", "JPN", "AUT", "CZE", "SVK", "HUN", "HRV", "KOR", "TWN", "THA"],
    1945: ["DEU", "JPN", "AUT", "CZE", "SVK", "HUN", "HRV", "KOR", "TWN", "THA"]
  };
  const ALLIED = {
    1939: ["GBR", "FRA", "CAN", "AUS", "NZL", "IND", "PAK", "BGD", "LKA", "MMR", "ZAF", "EGY", "SDN", "NGA", "GHA", "KEN", "TZA", "UGA", "ZMB", "ZWE", "MWI", "BWA", "NAM", "JAM", "TTO", "GUY", "BLZ", "CHN", "MNG"],
    1940: ["GBR", "CAN", "AUS", "NZL", "IND", "PAK", "BGD", "LKA", "MMR", "ZAF", "EGY", "SDN", "NGA", "GHA", "KEN", "TZA", "UGA", "ZMB", "ZWE", "MWI", "BWA", "NAM", "JAM", "TTO", "GUY", "BLZ", "CHN", "MNG", "GRC"],
    1941: ["GBR", "USA", "CAN", "AUS", "NZL", "IND", "PAK", "BGD", "LKA", "MMR", "ZAF", "EGY", "SDN", "NGA", "GHA", "KEN", "TZA", "UGA", "ZMB", "ZWE", "MWI", "BWA", "NAM", "JAM", "TTO", "GUY", "BLZ", "CHN", "MNG", "RUS", "KAZ", "UZB", "TKM", "KGZ", "TJK"],
    1942: ["GBR", "USA", "CAN", "AUS", "NZL", "IND", "PAK", "BGD", "LKA", "MMR", "ZAF", "EGY", "SDN", "NGA", "GHA", "KEN", "TZA", "UGA", "ZMB", "ZWE", "MWI", "BWA", "NAM", "JAM", "TTO", "GUY", "BLZ", "CHN", "MNG", "RUS", "KAZ", "UZB", "TKM", "KGZ", "TJK", "BRA", "MEX"],
    1943: ["GBR", "USA", "CAN", "AUS", "NZL", "IND", "PAK", "BGD", "LKA", "MMR", "ZAF", "EGY", "SDN", "NGA", "GHA", "KEN", "TZA", "UGA", "ZMB", "ZWE", "MWI", "BWA", "NAM", "JAM", "TTO", "GUY", "BLZ", "CHN", "MNG", "RUS", "KAZ", "UZB", "TKM", "KGZ", "TJK", "BRA", "MEX", "IRQ"],
    1944: ["GBR", "USA", "CAN", "AUS", "NZL", "IND", "PAK", "BGD", "LKA", "MMR", "ZAF", "EGY", "SDN", "NGA", "GHA", "KEN", "TZA", "UGA", "ZMB", "ZWE", "MWI", "BWA", "NAM", "JAM", "TTO", "GUY", "BLZ", "CHN", "MNG", "RUS", "KAZ", "UZB", "TKM", "KGZ", "TJK", "BRA", "MEX", "IRQ", "FRA", "ITA", "ROU", "BGR", "FIN", "GRC"],
    1945: ["GBR", "USA", "CAN", "AUS", "NZL", "IND", "PAK", "BGD", "LKA", "MMR", "ZAF", "EGY", "SDN", "NGA", "GHA", "KEN", "TZA", "UGA", "ZMB", "ZWE", "MWI", "BWA", "NAM", "JAM", "TTO", "GUY", "BLZ", "CHN", "MNG", "RUS", "KAZ", "UZB", "TKM", "KGZ", "TJK", "BRA", "MEX", "IRQ", "FRA", "ITA", "ROU", "BGR", "FIN", "GRC", "POL"]
  };
  const OCCUPIED = {
    1939: ["POL", "CZE"],
    1940: ["POL", "FRA", "DNK", "NOR", "NLD", "BEL", "LUX", "CZE", "ALB"],
    1941: ["POL", "FRA", "DNK", "NOR", "NLD", "BEL", "LUX", "CZE", "GRC", "YUG", "EST", "LVA", "LTU", "BLR", "UKR", "MDA"],
    1942: ["POL", "FRA", "DNK", "NOR", "NLD", "BEL", "LUX", "CZE", "GRC", "YUG", "EST", "LVA", "LTU", "BLR", "UKR", "MDA", "LBY"],
    1943: ["POL", "FRA", "DNK", "NOR", "NLD", "BEL", "LUX", "CZE", "GRC", "YUG", "EST", "LVA", "LTU", "BLR", "UKR", "MDA"],
    1944: ["POL", "DNK", "NOR", "NLD", "BEL", "LUX", "CZE", "GRC", "YUG", "EST", "LVA", "LTU", "BLR", "UKR", "MDA", "ALB"],
    1945: ["POL", "DNK", "NOR", "NLD", "BEL", "LUX", "CZE", "GRC", "YUG", "EST", "LVA", "LTU", "BLR", "UKR", "MDA", "ALB"]
  };

  const FRONTS = {
    1941: [[68, 28], [61, 30], [56, 34], [51, 37], [46, 39]],
    1942: [[68, 30], [61, 34], [56, 40], [50, 44], [45, 43]],
    1943: [[68, 28], [61, 31], [56, 35], [51, 37], [46, 38]],
    1944: [[68, 24], [61, 26], [56, 28], [51, 30], [46, 28]],
    1945: [[68, 16], [61, 18], [56, 20], [51, 21], [46, 18]]
  };

  function project(lon, lat) {
    const padX = w * .028, top = h * .09, mapW = w - padX * 2, mapH = h * .78;
    return { x: padX + (lon + 180) / 360 * mapW, y: top + (84 - lat) / (84 + 58) * mapH };
  }

  function categoryFor(iso) {
    if ((ALLIED[year] || []).includes(iso)) return "allied";
    if ((OCCUPIED[year] || []).includes(iso)) return "occupied";
    if ((AXIS[year] || []).includes(iso)) return "axis";
    return "neutral";
  }

  const COLORS = {
    axis: [196, 72, 47],
    allied: [126, 165, 181],
    occupied: [123, 85, 63],
    neutral: [126, 113, 88]
  };

  function drawBase() {
    if (!baseCtx || !window.WORLD_DOTS) return;
    const dots = window.WORLD_DOTS;
    baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    baseCtx.clearRect(0, 0, w, h);
    // backdrop
    const grad = baseCtx.createRadialGradient(w * .5, h * .48, 0, w * .5, h * .48, w * .62);
    grad.addColorStop(0, "rgba(25,21,15,.7)");
    grad.addColorStop(1, "rgba(8,7,6,0)");
    baseCtx.fillStyle = grad;
    baseCtx.fillRect(0, 0, w, h);

    // graticule
    baseCtx.strokeStyle = "rgba(233,222,196,.055)";
    baseCtx.lineWidth = 1;
    for (let lon = -150; lon <= 150; lon += 30) {
      const a = project(lon, 84), b = project(lon, -58);
      baseCtx.beginPath(); baseCtx.moveTo(a.x, a.y); baseCtx.lineTo(b.x, b.y); baseCtx.stroke();
    }
    for (let lat = -30; lat <= 60; lat += 30) {
      const a = project(-180, lat), b = project(180, lat);
      baseCtx.beginPath(); baseCtx.moveTo(a.x, a.y); baseCtx.lineTo(b.x, b.y); baseCtx.stroke();
    }
    const eqA = project(-180, 0), eqB = project(180, 0);
    baseCtx.strokeStyle = "rgba(209,154,74,.09)";
    baseCtx.beginPath(); baseCtx.moveTo(eqA.x, eqA.y); baseCtx.lineTo(eqB.x, eqB.y); baseCtx.stroke();

    // dots by category
    const radius = Math.max(1.05, Math.min(1.8, w / 680));
    const buckets = { axis: [], allied: [], occupied: [], neutral: [] };
    Object.keys(dots.countries).forEach((iso) => {
      const cat = categoryFor(iso);
      const arr = buckets[cat];
      dots.countries[iso].forEach((p) => {
        const pos = project(p[0] * 360 - 180, 84 - p[1] * 142);
        arr.push(pos);
      });
    });
    Object.keys(buckets).forEach((cat) => {
      const rgb = COLORS[cat];
      baseCtx.fillStyle = cat === "neutral" ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},.42)` : `rgba(${rgb[0]},${rgb[1]},${rgb[2]},.86)`;
      baseCtx.beginPath();
      buckets[cat].forEach((p) => {
        baseCtx.moveTo(p.x + radius, p.y);
        baseCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      });
      baseCtx.fill();
      if (cat === "axis") {
        baseCtx.fillStyle = "rgba(212,83,58,.12)";
        buckets[cat].forEach((p) => {
          baseCtx.beginPath();
          baseCtx.arc(p.x, p.y, radius * 3.2, 0, Math.PI * 2);
          baseCtx.fill();
        });
      }
    });

    // map labels
    baseCtx.font = "7px 'Special Elite', monospace";
    baseCtx.fillStyle = "rgba(233,222,196,.25)";
    baseCtx.letterSpacing = "2px";
    const labels = [["EUROPE", 15, 52], ["AFRICA", 18, 20], ["ASIA", 90, 48], ["PACIFIC", 155, 24], ["AMERICAS", -105, 42]];
    labels.forEach(([text, lon, lat]) => {
      const p = project(lon, lat);
      baseCtx.fillText(text, p.x, p.y);
    });
    baseCtx.letterSpacing = "0px";

    // eastern front
    const front = FRONTS[year];
    if (front) {
      baseCtx.strokeStyle = "rgba(235,183,104,.62)";
      baseCtx.lineWidth = 1.15;
      baseCtx.setLineDash([4, 4]);
      baseCtx.beginPath();
      front.forEach(([lat, lon], i) => {
        const p = project(lon, lat);
        if (i === 0) baseCtx.moveTo(p.x, p.y); else baseCtx.lineTo(p.x, p.y);
      });
      baseCtx.stroke();
      baseCtx.setLineDash([]);
      const p = project(33, 54);
      baseCtx.fillStyle = "rgba(235,183,104,.7)";
      baseCtx.font = "6px 'Special Elite', monospace";
      baseCtx.fillText("EASTERN FRONT / 示意", p.x + 10, p.y);
    }
  }

  function animate() {
    if (!ctx) return;
    if (!running) { raf = requestAnimationFrame(animate); return; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (baseCanvas) ctx.drawImage(baseCanvas, 0, 0, w, h);
    if (!reduceMotion) {
      const t = (performance.now() / 1000) % 9;
      const x = (t / 9) * w;
      const g = ctx.createLinearGradient(x - 70, 0, x, 0);
      g.addColorStop(0, "rgba(209,154,74,0)");
      g.addColorStop(.85, "rgba(209,154,74,.055)");
      g.addColorStop(1, "rgba(209,154,74,.12)");
      ctx.fillStyle = g;
      ctx.fillRect(x - 70, h * .06, 70, h * .84);
      ctx.strokeStyle = "rgba(209,154,74,.16)";
      ctx.lineWidth = .7;
      ctx.beginPath(); ctx.moveTo(x, h * .06); ctx.lineTo(x, h * .9); ctx.stroke();
    }
    raf = requestAnimationFrame(animate);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx = canvas.getContext("2d");
    baseCanvas = document.createElement("canvas");
    baseCanvas.width = canvas.width;
    baseCanvas.height = canvas.height;
    baseCtx = baseCanvas.getContext("2d");
    drawBase();
  }

  function setYear(y) {
    year = Number(y) || 1942;
    drawBase();
  }

  function init(el) {
    canvas = el;
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver((entries) => { running = entries[0]?.isIntersecting ?? true; }, { threshold: 0 });
    io.observe(canvas);
    if (!raf) raf = requestAnimationFrame(animate);
  }

  return {
    init,
    setYear,
    project,
    projectPct(lon, lat) {
      const p = project(lon, lat);
      return { x: p.x / Math.max(1, w), y: p.y / Math.max(1, h) };
    },
    resize
  };
})();
