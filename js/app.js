/* ============================================================
   WAR ARCHIVE — app shell, data rendering, dossier, search
   ============================================================ */
(() => {
  "use strict";

  const D = window.WW2;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const TYPES = {
    battle: { label: "战役", en: "BATTLEFILE", code: "BTL", accent: "#a53b27" },
    equipment: { label: "装备", en: "ORDNANCE", code: "EQ", accent: "#d19a4a" },
    person: { label: "人物", en: "FIGURE", code: "PER", accent: "#5d7d8b" },
    country: { label: "国家", en: "NATION", code: "CTR", accent: "#6c7155" },
    event: { label: "事件", en: "DECLASSIFIED", code: "EVT", accent: "#d4533a" }
  };
  const THEATRE_GROUPS = {
    "东欧": "欧洲", "西欧": "欧洲", "西线": "欧洲", "西线 · 空战": "欧洲",
    "东线": "东线", "太平洋": "太平洋", "北非": "北非", "亚洲": "亚洲"
  };
  const LEADER_IDS = new Set(["roosevelt", "churchill", "stalin", "chiang", "degaulle", "hitler", "mussolini", "hirohito", "tojo"]);
  const COUNTRY_MARK = { usa: "US", ussr: "SU", uk: "UK", china: "CN", germany: "DE", japan: "JP", italy: "IT", france: "FR" };

  const state = {
    battleFilter: "全部",
    equipmentFilter: "全部",
    peopleFilter: "全部",
    timelineYear: "1942",
    situationYear: 1942,
    searchIndex: [],
    searchSelected: -1,
    searchResults: [],
    lastFocus: null,
    soundOn: false,
    audio: null,
    dossierOpen: false,
    searchOpen: false,
    mobileOpen: false,
    tourOn: false
  };

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const byId = (arr) => new Map((arr || []).map((x) => [x.id, x]));
  const battlesById = byId(D.battles);
  const peopleById = byId(D.people);
  const countriesById = byId(D.countries);
  const eventsById = byId(D.events);

  const typeLabel = (type) => (TYPES[type] || TYPES.event).label;
  const sideText = (faction) => (faction === "axis" ? "轴心国" : faction === "allied" ? "同盟国" : "—");

  const yearDescriptions = {
    "1931": "九一八事变。中国局部抗战开始，也成为许多史家理解二战全球起点的前史。",
    "1933": "希特勒上台，德国民主制度瓦解。欧洲的战争阴影开始具体化。",
    "1935": "意大利入侵埃塞俄比亚。国际联盟的制裁失败，侵略成本被证明极低。",
    "1936": "西班牙内战爆发。德国、意大利与苏联的介入，使它成为二战前夜的代理战争。",
    "1937": "七七事变，中国全民族抗战爆发。淞沪会战与南京沦陷，把亚洲战争推向全面化。",
    "1938": "慕尼黑协定与水晶之夜。绥靖达到顶点，纳粹迫害也从法律歧视升级为公开暴力。",
    "1939": "德国入侵波兰，英法宣战。苏德条约、冬季战争与欧洲大陆的分割，让战争迅速扩大。",
    "1940": "法国六周崩溃，敦刻尔克撤退，不列颠空战。英国孤悬海峡，战争进入全球消耗阶段。",
    "1941": "巴巴罗萨行动、珍珠港、莫斯科城下。苏德战争与太平洋战争相继爆发，二战真正全球化。",
    "1942": "战争的转折之年：中途岛、斯大林格勒与阿拉曼，把轴心的扩张推到了极限。",
    "1943": "斯大林格勒的第六集团军投降，库尔斯克会战，意大利投降。盟军在全球转入反攻。",
    "1944": "诺曼底登陆与巴格拉季昂行动，东西两线同时撕裂德国防线。西欧与东欧相继解放。",
    "1945": "柏林陷落、德国投降、广岛与长崎原子弹、日本签署投降书。战争结束，核时代与冷战开始。"
  };

  /* ------------------------------------------------------------
     Small visual components
     ------------------------------------------------------------ */
  function gradeOf(value) {
    if (value >= 90) return "A";
    if (value >= 80) return "B";
    if (value >= 70) return "C";
    if (value >= 60) return "D";
    return "E";
  }
  function overallGrade(radar) {
    if (!radar || !radar.length) return "—";
    return gradeOf(radar.reduce((s, r) => s + r.value, 0) / radar.length);
  }
  function radarColor(item) {
    if (item.faction === "axis") return "#d4533a";
    if (item.faction === "allied") return "#93b6c2";
    if (item.theatre) {
      return { "东线": "#d4533a", "太平洋": "#93b6c2", "北非": "#d19a4a", "欧洲": "#d19a4a" }[THEATRE_GROUPS[item.theatre]] || "#d19a4a";
    }
    return "#d19a4a";
  }
  function axisPoint(cx, cy, r, index, count = 6) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  }
  function polygonString(points) {
    return points.map((p) => p[0].toFixed(2) + "," + p[1].toFixed(2)).join(" ");
  }
  function radarSVG(item, large = false) {
    if (!item.radar || !item.radar.length) return "";
    const values = item.radar.map((r) => Math.max(4, Math.min(100, Number(r.value) || 0)));
    const n = values.length;
    const color = radarColor(item);
    const cx = large ? 160 : 60;
    const cy = large ? 156 : 60;
    const radius = large ? 112 : 38;
    const labelRadius = large ? 141 : 50;
    const view = large ? "0 0 320 316" : "0 0 120 120";
    const rings = [0.25, 0.5, 0.75, 1].map((ratio) => {
      const pts = Array.from({ length: n }, (_, i) => axisPoint(cx, cy, radius * ratio, i, n));
      return `<polygon points="${polygonString(pts)}" fill="none" stroke="${large ? "rgba(232,221,196,.18)" : "rgba(232,221,196,.13)"}" stroke-width="${large ? 1 : 0.7}" ${ratio === 1 ? 'stroke-dasharray="3 3"' : ""}/>`;
    }).join("");
    const axes = Array.from({ length: n }, (_, i) => {
      const p = axisPoint(cx, cy, radius, i, n);
      return `<line x1="${cx}" y1="${cy}" x2="${p[0].toFixed(2)}" y2="${p[1].toFixed(2)}" stroke="rgba(232,221,196,.15)" stroke-width="${large ? 1 : 0.6}"/>`;
    }).join("");
    const pts = values.map((v, i) => axisPoint(cx, cy, radius * v / 100, i, n));
    const labels = large ? item.radar.map((r, i) => {
      const p = axisPoint(cx, cy, labelRadius, i, n);
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / n;
      const anchor = Math.abs(Math.cos(angle)) < 0.2 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";
      const label = esc(r.label);
      const len = Array.from(label).length;
      const fs = len >= 4 ? 9.8 : 10.8;
      return `<text x="${p[0].toFixed(1)}" y="${p[1].toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" fill="#b7a98e" font-family="'Barlow Condensed','Microsoft YaHei UI',sans-serif" font-size="${fs}" letter-spacing=".03em">${label}</text>`;
    }).join("") : "";
    return `<div class="mini-radar${large ? " mini-radar--large" : ""}" aria-label="六维雷达图">
      <svg viewBox="${view}" role="img" aria-label="${esc(item.name)} 六维能力雷达图">
        ${rings}${axes}
        <g class="radar-shape">
          <polygon points="${polygonString(pts)}" fill="${color}" fill-opacity="${large ? ".27" : ".2"}" stroke="${color}" stroke-width="${large ? 2.4 : 1.5}" stroke-linejoin="round"/>
          ${pts.map((p) => `<circle cx="${p[0].toFixed(2)}" cy="${p[1].toFixed(2)}" r="${large ? 3 : 2}" fill="${color}"/>`).join("")}
        </g>
        ${labels}
        <circle cx="${cx}" cy="${cy}" r="${large ? 2.5 : 1.5}" fill="${color}"/>
      </svg>
      ${large ? "" : '<span class="mini-radar__label">SIX-AXIS</span>'}
    </div>`;
  }
  function radarCard(item, title = "COMBAT PROFILE") {
    if (!item.radar) return "";
    return `<div class="radar-card">
      <div class="radar-card__head">
        <div><b>${esc(title)}</b>ASSESSMENT / 档案评级</div>
        <span class="radar-card__badge">${overallGrade(item.radar)}</span>
      </div>
      <div class="radar-large">${radarSVG(item, true)}</div>
      <div class="radar-card__sub">SIX-AXIS PROFILE · 叙事性比较，不是精确量化</div>
      <div class="grade-list">
        ${item.radar.map((r) => `<div class="grade-row"><span>${esc(r.label)}</span><b>${gradeOf(r.value)}</b><div class="grade-row__bar"><i style="--w:${Math.max(4, Math.min(100, r.value))}%"></i></div></div>`).join("")}
      </div>
      <div class="radar-card__foot"><span>WAR ARCHIVE / VISUAL ASSESSMENT</span><span>NON-CLASSIFIED</span></div>
    </div>`;
  }

  function fallbackKind(item) {
    if (item.theatre) return "battle";
    if (item.role) return "person";
    if (item.category) return "equipment";
    if (item.leaderId) return "country";
    return "event";
  }
  function fallbackIcon(item) {
    const kind = fallbackKind(item);
    if (kind === "battle") {
      return `<svg viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="60" cy="40" r="26"/><circle cx="60" cy="40" r="12"/><path d="M60 4v18M60 58v18M24 40h18M78 40h18M32 12l12 12M76 56l12 12M88 12L76 24M44 56L32 68"/></svg>`;
    }
    if (kind === "person") {
      return `<svg viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="60" cy="27" r="15"/><path d="M28 72c3-19 15-28 32-28s29 9 32 28M34 18c4-13 13-19 26-19s22 6 26 19"/></svg>`;
    }
    if (kind === "equipment") {
      if (item.category === "战机") return `<svg viewBox="0 0 160 80" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M15 42l43-5 22-20 7 17 48 4-48 8-8 21-19-19-45 1z"/><path d="M78 22l7 17"/></svg>`;
      if (item.category === "舰艇") return `<svg viewBox="0 0 160 80" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M10 52h140l-18 15H32zM32 52V36h18v16M58 52V26h16v26M84 52V30h17v22M112 52V38h15v14M78 26v-8h5v8M124 38V23h3v15"/></svg>`;
      if (item.category === "步兵") return `<svg viewBox="0 0 160 80" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M16 46h100l20 12-17 7-21-4H30L12 55zM42 46V35h16v11M98 46V34h11v12M73 46V25h6v21"/></svg>`;
      return `<svg viewBox="0 0 160 80" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M22 58l84-36 10 5-84 36zM106 22l11 6 9-4-8-7zM38 53l10 6M52 47l10 6M66 41l10 6M80 35l10 6"/><circle cx="42" cy="29" r="13"/><circle cx="42" cy="29" r="4"/></svg>`;
    }
    if (kind === "country") {
      return `<svg viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M18 55c8-10 12-18 10-31 13 4 19 10 27 5 9-6 16-2 22 4 3 3 5 9 8 11 5 3 11 1 15 7-4 8-13 13-24 13-9 0-16-4-25 0-9 3-19 2-33-9z"/><circle cx="60" cy="40" r="35" stroke-dasharray="3 4"/></svg>`;
    }
    const t = (item.type || "") + " " + (item.name || "");
    if (/核|原子|Trinity|Hiroshima/i.test(t)) {
      return `<svg viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="60" cy="40" r="7"/><circle cx="60" cy="40" r="25" stroke-dasharray="3 4"/><path d="M60 33V8M60 47v25M53 40H18M67 40h35M55 35L30 16M65 45l25 19M65 35l25-19M55 45L30 64"/></svg>`;
    }
    if (/暴行|种族灭绝|大屠杀|Nanjing|Holocaust/i.test(t)) {
      return `<svg viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M60 16c-8 10-13 18-13 26 0 8 6 14 13 14s13-6 13-14c0-8-5-16-13-26z"/><path d="M60 31v18M60 49c-3 0-5-2-5-5M60 49c3 0 5-2 5-5M42 66h36M38 72h44"/></svg>`;
    }
    if (/司法|审判|Nuremberg/i.test(t)) {
      return `<svg viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M60 12v56M42 68h36M60 22l-28 8M60 22l28 8M32 30l-10 18h20zM88 30L78 48h20z"/><circle cx="60" cy="14" r="3"/></svg>`;
    }
    if (/外交|峰会|条约|会议|Conference|Pact/i.test(t)) {
      return `<svg viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="60" cy="33" r="22"/><path d="M38 33h44M60 11c-8 9-12 15-12 22s4 13 12 22c8-9 12-15 12-22s-4-13-12-22zM28 62h64M36 68h48"/></svg>`;
    }
    return `<svg viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M30 10h45l15 15v45H30zM75 10v15h15M42 38h36M42 48h36M42 58h24"/></svg>`;
  }
  function imageMarkup(item, { alt = "", className = "", fallback = "IMAGE / CLASSIFIED" } = {}) {
    const hasImage = Boolean(item.image && D.credits && D.credits[item.image]);
    const src = hasImage ? `assets/images/${esc(item.image)}.jpg` : "";
    const code = esc(item.code || "");
    const label = esc(fallback);
    const img = hasImage ? `<img src="${src}" alt="${esc(alt || item.name)}" loading="lazy" decoding="async" ${className ? `class="${className}"` : ""} onerror="this.style.display='none';this.parentElement.classList.add('is-missing')">` : "";
    return `${img}<span class="image-fallback"><i class="if-code">${code}</i>${fallbackIcon(item)}<b>${esc(item.name || "")}</b><small>${label} / ARCHIVE PLATE</small></span>`;
  }

  function creditFor(item) {
    const credit = (D.credits || {})[item.image];
    if (!credit) return "图片来源：Wikimedia Commons / 公共历史档案";
    const artist = credit.artist ? String(credit.artist).slice(0, 80) : "Wikimedia Commons";
    return `图片来源：${artist} / ${credit.license || "公共档案"}`;
  }
  function creditLink(item) {
    const credit = (D.credits || {})[item.image];
    if (!credit || !credit.descriptionurl) return "";
    return `<a href="${esc(credit.descriptionurl)}" target="_blank" rel="noopener noreferrer">Wikimedia Commons ↗</a>`;
  }
  function formatCredit(item) {
    return `${esc(creditFor(item))} ${creditLink(item)}`;
  }

  /* ------------------------------------------------------------
     Flag artwork (deliberately avoids hate symbols)
     ------------------------------------------------------------ */
  function flagSVG(id) {
    const common = 'viewBox="0 0 90 60" xmlns="http://www.w3.org/2000/svg"';
    if (id === "usa") {
      const stars = [];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) stars.push(`<circle cx="${9 + c * 6}" cy="${7 + r * 6}" r="1.35" fill="#f4eee0"/>`);
      return `<svg ${common}><rect width="90" height="60" fill="#f1e9d8"/><g fill="#9e2d28">${Array.from({ length: 7 }, (_, i) => `<rect y="${i * 8.6}" width="90" height="4.3"/>`).join("")}</g><rect width="39" height="32" fill="#243c5a"/>${stars.join("")}</svg>`;
    }
    if (id === "ussr") {
      return `<svg ${common}><rect width="90" height="60" fill="#a52d25"/><path d="M45 7l2.6 7.8H56l-6.7 4.9 2.5 7.8L45 22.6l-6.8 4.9 2.5-7.8-6.7-4.9h8.4z" fill="#d8b25e"/><path d="M30 43c5-8 15-12 23-10" fill="none" stroke="#d8b25e" stroke-width="3.2" stroke-linecap="round"/><path d="M51 32c2 4 1 8-2 10" fill="none" stroke="#d8b25e" stroke-width="2.6" stroke-linecap="round"/><path d="M29 48l15-14" stroke="#d8b25e" stroke-width="3" stroke-linecap="round"/><rect x="41" y="27" width="12" height="5" rx="1.2" fill="#d8b25e" transform="rotate(-42 47 29)"/></svg>`;
    }
    if (id === "uk") {
      return `<svg ${common}><rect width="90" height="60" fill="#1b3f63"/><path d="M0 0l90 60M90 0L0 60" stroke="#f1e9d8" stroke-width="12"/><path d="M0 0l90 60M90 0L0 60" stroke="#a52d25" stroke-width="5"/><path d="M45 0v60M0 30h90" stroke="#f1e9d8" stroke-width="18"/><path d="M45 0v60M0 30h90" stroke="#a52d25" stroke-width="10"/></svg>`;
    }
    if (id === "china") {
      const rays = Array.from({ length: 12 }, (_, i) => {
        const a = i * 30 * Math.PI / 180;
        const x1 = 24 + Math.cos(a) * 5.5, y1 = 17 + Math.sin(a) * 5.5;
        const x2 = 24 + Math.cos(a) * 13, y2 = 17 + Math.sin(a) * 13;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#f4eee0" stroke-width="2.5"/>`;
      }).join("");
      return `<svg ${common}><rect width="90" height="60" fill="#a52d25"/><rect width="45" height="30" fill="#243c5a"/><circle cx="24" cy="17" r="7.5" fill="#f4eee0"/>${rays}<circle cx="24" cy="17" r="4" fill="#243c5a"/></svg>`;
    }
    if (id === "germany") {
      return `<svg ${common}><rect width="90" height="60" fill="#251512"/><circle cx="45" cy="30" r="17" fill="#e8ddc4"/><path d="M45 15v30M30 30h30" stroke="#15110b" stroke-width="7"/><path d="M45 15v30M30 30h30" stroke="#e8ddc4" stroke-width="2"/><circle cx="45" cy="30" r="17" fill="none" stroke="#15110b" stroke-width="2"/></svg>`;
    }
    if (id === "japan") {
      return `<svg ${common}><rect width="90" height="60" fill="#f1e9d8"/><circle cx="45" cy="30" r="14" fill="#b6322b"/></svg>`;
    }
    if (id === "italy") {
      return `<svg ${common}><rect width="90" height="60" fill="#f1e9d8"/><rect width="30" height="60" fill="#2d6b4e"/><rect x="60" width="30" height="60" fill="#a52d25"/><path d="M45 18l10 6v12c0 8-6 12-10 14-4-2-10-6-10-14V24z" fill="#f1e9d8" stroke="#8d6b3f" stroke-width="1.2"/><path d="M45 25v18M38 32h14" stroke="#a52d25" stroke-width="2"/></svg>`;
    }
    if (id === "france") {
      return `<svg ${common}><rect width="90" height="60" fill="#f1e9d8"/><rect width="30" height="60" fill="#243c5a"/><rect x="60" width="30" height="60" fill="#a52d25"/><path d="M45 14v33M41 14h8M43 20h4M45 20v9M40 29h10" stroke="#d8b25e" stroke-width="2" fill="none"/></svg>`;
    }
    return `<svg ${common}><rect width="90" height="60" fill="#4b4233"/><circle cx="45" cy="30" r="14" fill="none" stroke="#e8ddc4"/></svg>`;
  }

  /* ------------------------------------------------------------
     Render: timeline
     ------------------------------------------------------------ */
  function renderTimeline() {
    const years = Array.from(new Set(D.timeline.map((t) => t.year))).sort();
    const counts = D.timeline.reduce((m, t) => (m[t.year] = (m[t.year] || 0) + 1, m), {});
    const tabs = $("#year-tabs");
    tabs.innerHTML = years.map((year) => `<button type="button" data-year="${year}" class="${String(year) === state.timelineYear ? "is-active" : ""}" role="tab" aria-selected="${String(year) === state.timelineYear}"><b>${year}</b><small>${counts[year]} 条</small></button>`).join("");
    const vertical = $("#timeline-vertical");
    vertical.innerHTML = years.map((year) => `<button type="button" data-year="${year}" class="${String(year) === state.timelineYear ? "is-active" : ""}"><span>${year}</span><small>${counts[year]}</small></button>`).join("");
    $("#timeline-count").textContent = `${D.timeline.length} ENTRIES`;
    renderTimelineFeed();
    tabs.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-year]");
      if (!btn) return;
      state.timelineYear = btn.dataset.year;
      syncTimeline();
    });
    vertical.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-year]");
      if (!btn) return;
      state.timelineYear = btn.dataset.year;
      syncTimeline();
    });
    $("#timeline-all").addEventListener("click", () => {
      state.timelineYear = state.timelineYear === "all" ? "1942" : "all";
      syncTimeline();
    });
  }
  function syncTimeline() {
    const isAll = state.timelineYear === "all";
    $$("#year-tabs button").forEach((b) => {
      const on = b.dataset.year === state.timelineYear;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", String(on));
    });
    $$("#timeline-vertical button").forEach((b) => b.classList.toggle("is-active", b.dataset.year === state.timelineYear));
    $("#timeline-all").innerHTML = isAll ? '回到 1942 <span>↩</span>' : '查看全部年份 <span>↗</span>';
    $("#timeline-year").textContent = isAll ? "ALL" : state.timelineYear;
    $("#timeline-year-copy").textContent = isAll
      ? "全部年份按时间顺序展开。从九一八到密苏里号，十四年战争不是一条直线，而是多个战场相互牵引的链条。"
      : (yearDescriptions[state.timelineYear] || "");
    renderTimelineFeed();
  }
  function timelineItemHTML(t, showYearHead = false) {
    if (showYearHead) {
      return `<div class="timeline-item timeline-item--year-head"><b>${t.year}</b><span>${t.year === 1931 ? "LOCAL WAR BEGINS" : t.year === 1945 ? "THE END / AFTERMATH" : "GLOBAL WAR"}</span></div>`;
    }
    const link = t.link ? `<a href="#${t.link.type}s" class="timeline-item__link" data-open-type="${t.link.type}" data-open-id="${t.link.id}">打开完整档案 <span>↗</span></a>` : "";
    return `<article class="timeline-item">
      <div class="timeline-item__date">${esc(t.date)}</div>
      <div class="timeline-item__body">
        <h3>${esc(t.title)}<span>${esc(t.en)}</span></h3>
        <p>${esc(t.text)}</p>
        ${link}
      </div>
      <div class="timeline-item__tag">${esc(t.tag)}</div>
    </article>`;
  }
  function renderTimelineFeed() {
    const feed = $("#timeline-feed");
    if (state.timelineYear === "all") {
      const years = Array.from(new Set(D.timeline.map((t) => t.year))).sort();
      feed.innerHTML = years.map((year) => {
        const entries = D.timeline.filter((t) => t.year === year);
        return timelineItemHTML({ year }, true) + entries.map((t) => timelineItemHTML(t)).join("");
      }).join("");
    } else {
      const entries = D.timeline.filter((t) => String(t.year) === state.timelineYear);
      feed.innerHTML = entries.length ? entries.map((t) => timelineItemHTML(t)).join("") : '<div class="timeline-empty">该年份暂无条目</div>';
    }
  }

  /* ------------------------------------------------------------
     Render: battles
     ------------------------------------------------------------ */
  function battleFeatureHTML(item) {
    if (!item) return "";
    return `<article class="battle-feature" data-file-type="battle" data-file-id="${item.id}">
      <div class="battle-feature__media">
        ${imageMarkup(item, { alt: item.name + " 历史影像", fallback: "BATTLE / NO IMAGE" })}
        <span class="battle-feature__badge"><i class="dot dot--red"></i> FEATURED BATTLE / ${esc(item.theatre)}</span>
      </div>
      <div class="battle-feature__body">
        <div class="battle-feature__meta"><span>${esc(item.code)}</span><span>${esc(item.date)}</span><span>${esc(item.place)}</span></div>
        <h3>${esc(item.name)}<em>${esc(item.en)}</em></h3>
        <p>${esc(item.summary)}</p>
        <div class="battle-feature__stats">
          <div><span>RESULT / 结果</span><b>${esc(item.result)}</b></div>
          <div><span>THEATRE / 战区</span><b>${esc(item.theatre)}</b></div>
        </div>
        <a href="#battles" class="btn btn--small btn--primary" data-open-type="battle" data-open-id="${item.id}">解密战役档案 <i>↗</i></a>
      </div>
    </article>`;
  }
  function battleCardHTML(item) {
    return `<article class="battle-card filterable" data-file-type="battle" data-file-id="${item.id}" data-filter-value="${esc(item.theatreGroup || THEATRE_GROUPS[item.theatre] || "其他")}">
      <div class="battle-card__media">
        ${imageMarkup(item, { alt: item.name + " 历史影像", fallback: "BATTLE / NO IMAGE" })}
        <span class="battle-card__code">${esc(item.code)}</span>
        <span class="battle-card__date">${esc(item.date)}</span>
      </div>
      <div class="battle-card__body">
        <div class="battle-card__theatre"><span>${esc(item.place)}</span><span>${esc(item.theatre)}</span></div>
        <h3>${esc(item.name)}</h3>
        <div class="battle-card__en">${esc(item.en)}</div>
        <p class="battle-card__summary">${esc(item.summary)}</p>
        <div class="battle-card__foot"><span class="battle-card__result">${esc(item.result)}</span><span class="battle-card__open">OPEN ↗</span></div>
      </div>
    </article>`;
  }
  function renderBattles() {
    D.battles.forEach((b) => { b.theatreGroup = THEATRE_GROUPS[b.theatre] || "其他"; });
    const featured = D.battles.find((b) => b.id === "stalingrad") || D.battles[0];
    $("#battle-feature").innerHTML = battleFeatureHTML(featured);
    $("#battles-grid").innerHTML = D.battles.map(battleCardHTML).join("");
    syncBattleFeature(state.battleFilter);
    updateCounts("battles", D.battles, (b) => b.theatreGroup, "全部");
  }
  function syncBattleFeature(filter) {
    const list = filter === "全部" ? D.battles : D.battles.filter((b) => b.theatreGroup === filter);
    const featured = filter === "全部" ? (D.battles.find((b) => b.id === "stalingrad") || list[0]) : list[0];
    if (featured) {
      $("#battle-feature").hidden = false;
      $("#battle-feature").innerHTML = battleFeatureHTML(featured);
    } else {
      $("#battle-feature").hidden = true;
    }
  }

  /* ------------------------------------------------------------
     Render: equipment
     ------------------------------------------------------------ */
  function equipmentCardHTML(item) {
    const specs = (item.specs || []).slice(0, 3).map((s) => `<span>${esc(s[0])} · ${esc(s[1])}</span>`).join("");
    return `<article class="eq-card filterable" data-file-type="equipment" data-file-id="${item.id}" data-filter-value="${esc(item.category)}">
      <div class="eq-card__bar"><span>${esc(item.code)}</span><span>${esc(item.country)} / ${esc(item.years.split("—")[0])}</span></div>
      <div class="eq-card__media">
        ${imageMarkup(item, { alt: item.name + " 历史影像", fallback: "ORDNANCE / NO IMAGE" })}
        <span class="eq-card__cat">${esc(item.category)}</span>
      </div>
      <div class="eq-card__body">
        <div class="eq-card__head">
          <div><h3>${esc(item.name)}</h3><div class="eq-card__en">${esc(item.en)}</div></div>
          ${radarSVG(item)}
        </div>
        <p>${esc(item.tagline)}</p>
        <div class="eq-card__specs">${specs}</div>
        <div class="eq-card__foot"><span>${esc(item.country)} · ${sideText(item.faction)}</span><span>↗</span></div>
      </div>
    </article>`;
  }
  function renderEquipment() {
    $("#equipment-grid").innerHTML = D.equipment.map(equipmentCardHTML).join("");
    updateCounts("equipment", D.equipment, (x) => x.category, "全部");
  }

  /* ------------------------------------------------------------
     Render: people
     ------------------------------------------------------------ */
  function peopleKind(person) {
    return LEADER_IDS.has(person.id) ? "leader" : "commander";
  }
  function peopleCardHTML(item) {
    return `<article class="people-card filterable" data-file-type="person" data-file-id="${item.id}" data-filter-value="${item.faction} ${peopleKind(item)}">
      <div class="people-card__media">
        ${imageMarkup(item, { alt: item.name + " 肖像", fallback: "PORTRAIT / NO IMAGE" })}
        <span class="people-card__code">${esc(item.code)}</span>
        <span class="people-card__side"><i class="${item.faction === "axis" ? "side-axis" : "side-allied"}"></i>${sideText(item.faction)}</span>
      </div>
      <div class="people-card__body">
        <div class="people-card__head">
          <div>
            <div class="people-card__role">${esc(item.role)}</div>
            <h3>${esc(item.name)}</h3>
            <div class="people-card__en">${esc(item.en)}</div>
          </div>
          ${radarSVG(item)}
        </div>
        <p>${esc(item.tagline)}</p>
        <div class="people-card__foot"><span>${esc(item.country)} · ${esc(item.years)}</span><span>OPEN ↗</span></div>
      </div>
    </article>`;
  }
  function renderPeople() {
    $("#people-grid").innerHTML = D.people.map(peopleCardHTML).join("");
    const counts = { "全部": D.people.length, allied: 0, axis: 0, leader: 0, commander: 0 };
    D.people.forEach((p) => { counts[p.faction]++; counts[peopleKind(p)]++; });
    $$("#people-filters button").forEach((b) => {
      const val = b.dataset.filter;
      const small = b.querySelector("small");
      if (small && counts[val] != null) small.textContent = String(counts[val]).padStart(2, "0");
    });
  }

  /* ------------------------------------------------------------
     Render: countries
     ------------------------------------------------------------ */
  function countryCardHTML(item) {
    const leader = peopleById.get(item.leaderId);
    return `<article class="country-card country-card--${item.faction} filterable" data-file-type="country" data-file-id="${item.id}" data-filter-value="${item.faction}">
      <span class="country-card__bg">${COUNTRY_MARK[item.id] || "XX"}</span>
      <div class="country-card__top">
        <div class="flag" title="示意旗帜">${flagSVG(item.flag)}</div>
        <div class="country-card__code">${esc(item.code)} / ${sideText(item.faction)}<b>${esc(item.entry.split(" ")[0])}</b></div>
      </div>
      <div class="country-card__title">
        <h3>${esc(item.short)}<small>${esc(item.en)}</small></h3>
        <span>${esc(item.name)}</span>
      </div>
      <p class="country-card__role">${esc(item.intro)}</p>
      <div class="country-card__bottom">
        <div>
          <div class="country-stats">
            <div><span>POPULATION</span><b>${esc(item.population)}</b></div>
            <div><span>MOBILIZED</span><b>${esc(item.mobilized)}</b></div>
            <div><span>DEATHS</span><b>${esc(item.deaths)}</b></div>
            <div><span>CAPITAL</span><b>${esc(item.capital.split("；")[0])}</b></div>
          </div>
          <div class="country-card__leader">${leader ? imageMarkup(leader, { alt: leader.name }) : ""}<b>${esc(item.leader)}</b></div>
        </div>
        ${radarSVG(item)}
      </div>
    </article>`;
  }
  function renderCountries() {
    $("#country-grid").innerHTML = D.countries.map(countryCardHTML).join("");
  }

  /* ------------------------------------------------------------
     Render: events
     ------------------------------------------------------------ */
  function eventCardHTML(item, index) {
    return `<article class="event-card ${index < 2 ? "is-wide" : ""}" data-file-type="event" data-file-id="${item.id}">
      <div class="event-card__media">
        ${imageMarkup(item, { alt: item.name + " 历史影像", fallback: "EVENT / NO IMAGE" })}
        <span class="event-card__type">${esc(item.type)}</span>
      </div>
      <div class="event-card__body">
        <div class="event-card__date">${esc(item.date)} · ${esc(item.place)}</div>
        <h3>${esc(item.name)}</h3>
        <div class="event-card__en">${esc(item.en)}</div>
        <p>${esc(item.summary)}</p>
        <div class="event-card__foot"><span>${esc(item.code)}</span><span>DECLASSIFY ↗</span></div>
      </div>
    </article>`;
  }
  function renderEvents() {
    $("#event-grid").innerHTML = D.events.map(eventCardHTML).join("");
  }

  /* ------------------------------------------------------------
     Filters
     ------------------------------------------------------------ */
  function updateCounts(group, items, keyFn, allLabel) {
    const counts = { [allLabel]: items.length };
    items.forEach((x) => { const k = keyFn(x); counts[k] = (counts[k] || 0) + 1; });
    const container = group === "battles" ? $("#battle-filters") : group === "equipment" ? $("#equipment-filters") : $("#people-filters");
    if (!container) return;
    $$("button", container).forEach((b) => {
      const val = b.dataset.filter;
      const small = b.querySelector("small");
      if (small && counts[val] != null) small.textContent = String(counts[val]).padStart(2, "0");
    });
    // remove battle filter for a theatre with no files
    if (group === "battles") {
      $$("#battle-filters button").forEach((b) => {
        if (b.dataset.filter === "亚洲" && !counts["亚洲"]) b.remove();
      });
    }
  }
  function applyFilter(group, value) {
    const grid = group === "battles" ? $("#battles-grid") : group === "equipment" ? $("#equipment-grid") : $("#people-grid");
    const cards = $$(".filterable", grid);
    cards.forEach((card) => {
      const values = (card.dataset.filterValue || "").split(/\s+/);
      const show = value === "全部" || values.includes(value);
      card.classList.toggle("is-hidden", !show);
    });
    if (group === "battles") syncBattleFeature(value);
    if (group === "battles") state.battleFilter = value;
    if (group === "equipment") state.equipmentFilter = value;
    if (group === "people") state.peopleFilter = value;
  }
  function initFilters() {
    const bind = (containerId, group) => {
      const container = $(containerId);
      if (!container) return;
      container.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-filter]");
        if (!btn) return;
        $$("button", container).forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        applyFilter(group, btn.dataset.filter);
      });
    };
    bind("#battle-filters", "battles");
    bind("#equipment-filters", "equipment");
    bind("#people-filters", "people");
    $$("[data-filter-jump]").forEach((link) => {
      link.addEventListener("click", () => {
        const val = link.dataset.filterJump;
        const btn = $(`#battle-filters button[data-filter="${val}"]`);
        if (btn) {
          $$("#battle-filters button").forEach((b) => b.classList.remove("is-active"));
          btn.classList.add("is-active");
          applyFilter("battles", val);
        }
      });
    });
  }

  /* ------------------------------------------------------------
     Situation board
     ------------------------------------------------------------ */
  const markPositions = {
    "波兰战役": [52.23, 21.01], "冬季战争": [60.17, 24.94],
    "法国战役": [49.0, 2.5], "敦刻尔克": [51.03, 2.38], "不列颠空战": [51.5, -0.12],
    "巴巴罗萨": [53.9, 27.56], "莫斯科": [55.75, 37.62], "珍珠港": [21.35, -157.95],
    "中途岛": [28.2, -177.37], "斯大林格勒": [48.71, 44.51], "阿拉曼": [30.83, 28.95],
    "库尔斯克": [51.73, 36.19], "意大利投降": [41.9, 12.5], "诺曼底": [49.34, -0.6],
    "巴格拉季昂": [53.9, 27.56], "柏林": [52.52, 13.4], "硫磺岛": [24.78, 141.32],
    "广岛": [34.39, 132.45]
  };
  function renderSituationYears() {
    const wrap = $("#situation-years");
    wrap.innerHTML = D.situation.map((s) => `<button type="button" data-situation-year="${s.year}" class="${s.year === state.situationYear ? "is-active" : ""}" role="tab" aria-selected="${s.year === state.situationYear}">${s.year}</button>`).join("");
    wrap.addEventListener("click", (e) => {
      const b = e.target.closest("[data-situation-year]");
      if (!b) return;
      state.situationYear = Number(b.dataset.situationYear);
      $$("button", wrap).forEach((x) => x.classList.toggle("is-active", Number(x.dataset.situationYear) === state.situationYear));
      renderSituation();
    });
  }
  function renderSituation() {
    const s = D.situation.find((x) => x.year === state.situationYear) || D.situation[0];
    $("#situation-year").textContent = s.year;
    $("#situation-kicker").textContent = `${s.label} / ${["THE EUROPEAN WAR BEGINS", "BLITZKRIEG AT ITS PEAK", "A TRULY GLOBAL WAR", "THE LIMITS OF AXIS POWER", "THE GEARS OF COUNTERATTACK", "LIBERATION AND RUINS", "ENDGAME AND THE BOMB"][D.situation.indexOf(s)] || "SITUATION"}`;
    $("#situation-title").textContent = s.title;
    $("#situation-lead").textContent = s.lead;
    $("#situation-axis").textContent = s.axis;
    $("#situation-allied").textContent = s.allied;
    $("#situation-turning").textContent = s.turning;
    $("#situation-focus").textContent = s.focus;
    $("#situation-marks-list").innerHTML = (s.marks || []).map((m) => `<span>${esc(m)}</span>`).join("");
    const marks = $("#situation-marks");
    marks.innerHTML = "";
    (s.marks || []).forEach((name) => {
      const coords = markPositions[name];
      if (!coords || !window.SituationMap) return;
      const p = window.SituationMap.projectPct(coords[1], coords[0]);
      if (!p) return;
      const el = document.createElement("div");
      el.className = "map-mark is-visible";
      el.style.left = (p.x * 100) + "%";
      el.style.top = (p.y * 100) + "%";
      el.innerHTML = `<i></i><span>${esc(name)}</span>`;
      marks.appendChild(el);
    });
    if (window.SituationMap) window.SituationMap.setYear(s.year);
  }

  /* ------------------------------------------------------------
     Search index + UI
     ------------------------------------------------------------ */
  function buildSearchIndex() {
    const add = (type, arr, descFn, metaFn) => arr.forEach((item) => {
      state.searchIndex.push({
        type, id: item.id, name: item.name, en: item.en || "",
        desc: descFn(item), meta: metaFn ? metaFn(item) : "",
        haystack: [item.name, item.en, item.summary, item.tagline, item.role, item.country, item.short, item.type, item.place, item.theatre, ...(item.tags || [])].filter(Boolean).join(" ").toLowerCase()
      });
    });
    add("battle", D.battles, (x) => x.summary, (x) => x.date + " · " + x.theatre);
    add("equipment", D.equipment, (x) => x.tagline, (x) => x.country + " · " + x.category);
    add("person", D.people, (x) => x.tagline, (x) => x.country + " · " + x.role);
    add("country", D.countries, (x) => x.intro, (x) => x.name + " · " + sideText(x.faction));
    add("event", D.events, (x) => x.summary, (x) => x.date + " · " + x.type);
  }
  function searchQuery(q) {
    const needle = q.trim().toLowerCase();
    if (!needle) return state.searchIndex.slice(0, 8);
    const tokens = needle.split(/\s+/).filter(Boolean);
    return state.searchIndex
      .map((item) => {
        let score = 0;
        tokens.forEach((tok) => {
          if (item.name.toLowerCase().includes(tok)) score += 9;
          if (item.en.toLowerCase().includes(tok)) score += 5;
          if (item.haystack.includes(tok)) score += 2;
        });
        return { item, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((x) => x.item);
  }
  function renderSearch(q = "") {
    const results = searchQuery(q);
    state.searchResults = results;
    state.searchSelected = results.length ? 0 : -1;
    const box = $("#search-results");
    if (!results.length) {
      box.innerHTML = '<div class="search-empty">没有匹配的档案。试试“斯大林格勒”“T-34”“大屠杀”或“中途岛”。</div>';
      return;
    }
    box.innerHTML = results.map((item, i) => `<div class="search-result ${i === 0 ? "is-selected" : ""}" data-result-index="${i}" role="option" aria-selected="${i === 0}">
      <span class="search-result__type">${typeLabel(item.type)}<br>${TYPES[item.type].code}</span>
      <div class="search-result__body"><b>${esc(item.name)} <span style="color:var(--dim);font-size:9px">${esc(item.en)}</span></b><span>${esc(item.meta)} — ${esc(item.desc)}</span></div>
      <span class="search-result__arrow">↗</span>
    </div>`).join("");
  }
  function selectSearchResult(index) {
    const item = state.searchResults[index];
    if (!item) return;
    closeSearch();
    openDossier(item.type, item.id);
  }
  function openSearch() {
    state.searchOpen = true;
    state.lastFocus = document.activeElement;
    $("#search-overlay").classList.add("is-open");
    $("#search-overlay").setAttribute("aria-hidden", "false");
    $("#search-input").value = "";
    renderSearch("");
    syncLock();
    setTimeout(() => $("#search-input").focus(), 80);
  }
  function closeSearch() {
    state.searchOpen = false;
    $("#search-overlay").classList.remove("is-open");
    $("#search-overlay").setAttribute("aria-hidden", "true");
    syncLock();
  }
  function initSearch() {
    buildSearchIndex();
    $("#search-open").addEventListener("click", openSearch);
    $("#search-close").addEventListener("click", closeSearch);
    $("#search-overlay").addEventListener("click", (e) => { if (e.target === $("#search-overlay")) closeSearch(); });
    const input = $("#search-input");
    let timer;
    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => renderSearch(input.value), 90);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const dir = e.key === "ArrowDown" ? 1 : -1;
        state.searchSelected = (state.searchSelected + dir + state.searchResults.length) % Math.max(1, state.searchResults.length);
        $$(".search-result").forEach((el, i) => {
          el.classList.toggle("is-selected", i === state.searchSelected);
          el.setAttribute("aria-selected", String(i === state.searchSelected));
        });
        const selected = $(".search-result.is-selected");
        if (selected) selected.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        e.preventDefault();
        selectSearchResult(state.searchSelected);
      }
    });
    $("#search-results").addEventListener("click", (e) => {
      const el = e.target.closest("[data-result-index]");
      if (el) selectSearchResult(Number(el.dataset.resultIndex));
    });
    $("#search-suggest").addEventListener("click", (e) => {
      const b = e.target.closest("[data-search]");
      if (!b) return;
      input.value = b.dataset.search;
      renderSearch(input.value);
      input.focus();
    });
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        state.searchOpen ? closeSearch() : openSearch();
      }
    });
  }

  /* ------------------------------------------------------------
     Dossier
     ------------------------------------------------------------ */
  function dossierTop(item, type) {
    return `<div class="dossier__topbar">
      <div><b>DECLASSIFIED</b> / ARCHIVE COPY / ${TYPES[type].en}</div>
      <div class="dossier__file">${esc(item.code)} · FILE WW2-${String(item.code).replace(/\D/g, "").padStart(3, "0")}</div>
    </div>`;
  }
  function dossierHero(item, type, lead, extraFacts = "", imageItem = item) {
    const tags = (item.tags || []).slice(0, 5).map((t) => `<span>${esc(t)}</span>`).join("");
    return `<div class="dossier-hero">
      <div class="dossier-hero__media">
        ${imageMarkup(imageItem, { alt: item.name + " 档案影像", fallback: "ARCHIVE / NO IMAGE" })}
        <span class="dossier-hero__credit">${formatCredit(imageItem)}</span>
      </div>
      <div class="dossier-hero__info">
        <div class="dossier-kicker">${typeLabel(type)}档案 / ${TYPES[type].en} / ${esc(item.code)}</div>
        <h2 class="dossier-title" id="dossier-title">${esc(item.name)}</h2>
        <div class="dossier-en">${esc(item.en)}</div>
        <div class="dossier-tags">${tags}</div>
        <p class="dossier-lead">${esc(lead)}</p>
        <div class="dossier-factline">${extraFacts}</div>
      </div>
    </div>`;
  }
  function dossierFooter(item, type, imageItem = item) {
    return `<div class="dossier-footer">
      <span>${formatCredit(imageItem)}</span>
      <span>${TYPES[type].en} / ARCHIVE NO. ${esc(item.code)} / 本站为历史科普与视觉叙事</span>
    </div>`;
  }
  function specTable(rows) {
    return `<table class="spec-table">${rows.map((r) => `<tr><th>${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join("")}</table>`;
  }
  function paragraphs(body) {
    return (body || []).map((p) => `<p>${esc(p)}</p>`).join("");
  }
  function dossierSection(title, en) {
    return `<div class="dossier-section-title"><b>${esc(title)}</b> ${esc(en)}</div>`;
  }

  function battleDossier(item) {
    return `<div class="dossier-grid">
      <div class="dossier-main">
        ${dossierSection("战史档案", "THE RECORD")}
        <div class="dossier-body">${paragraphs(item.body)}</div>
        <div class="dossier-quote">${esc(item.quote || item.significance)}<small>WAR ARCHIVE / 战史注脚</small></div>
        ${dossierSection("战略意义", "WHY IT MATTERS")}
        <p style="font-family:var(--serif);font-size:12.5px;line-height:2;color:#31281e">${esc(item.significance)}</p>
        <div class="dossier-callout">
          <div><span>BELLIGERENTS / 交战方</span><b>${esc(item.belligerents)}</b></div>
          <div><span>COMMANDERS / 指挥官</span><b>${esc(item.commanders)}</b></div>
          <div><span>CASUALTIES / 伤亡</span><b>${esc(item.casualties)}</b></div>
        </div>
        ${dossierSection("作战数据", "ORDER OF BATTLE")}
        ${specTable([["时间", item.date], ["地点", item.place], ["战区", item.theatre], ["结果", item.result], ["兵力", item.forces], ["伤亡", item.casualties]])}
      </div>
      <aside class="dossier-side">
        ${radarCard(item, "BATTLE INTENSITY / 战况六维")}
        <div class="side-note">战况雷达为编辑性比较：规模、惨烈、战略影响、转折性、技术含量与持续时间，不是精确的军事量化指标。</div>
      </aside>
    </div>
    ${dossierFooter(item, "battle")}`;
  }
  function equipmentDossier(item) {
    return `<div class="dossier-grid">
      <div class="dossier-main">
        ${dossierSection("装备档案", "THE MACHINE")}
        <div class="dossier-body">${paragraphs(item.body)}</div>
        <div class="dossier-quote">${esc(item.verdict)}<small>WAR ARCHIVE / 战史判词</small></div>
        ${dossierSection("技术参数", "TECHNICAL DATA")}
        ${specTable(item.specs)}
        ${dossierSection("武装与定位", "ARMAMENT & ROLE")}
        <p style="font-family:var(--serif);font-size:12.5px;line-height:2;color:#31281e">${esc(item.armament)}</p>
        <div class="dossier-callout">
          <div><span>ORIGIN / 国别</span><b>${esc(item.country)}</b></div>
          <div><span>SERVICE / 服役</span><b>${esc(item.years)}</b></div>
          <div><span>CLASS / 类别</span><b>${esc(item.category)}</b></div>
        </div>
      </div>
      <aside class="dossier-side">
        ${radarCard(item, "COMBAT PROFILE / 性能六维")}
        <div class="side-note">性能雷达为叙事性比较，综合火力、防护、机动、可靠性、产量与历史影响，不代表具体战场条件下的绝对优劣。</div>
      </aside>
    </div>
    ${dossierFooter(item, "equipment")}`;
  }
  function personDossier(item) {
    return `<div class="dossier-grid">
      <div class="dossier-main">
        ${dossierSection("人物档案", "THE FIGURE")}
        <div class="dossier-body">${paragraphs(item.body)}</div>
        <div class="dossier-quote">${esc(item.quote)}<small>${esc(item.name)} / ${esc(item.en)}</small></div>
        ${dossierSection("关键节点", "COMMAND & ACTION")}
        <div class="dossier-timeline">${(item.commands || []).map((c) => `<div><span>●</span><p>${esc(c)}</p></div>`).join("")}</div>
        ${dossierSection("结局与遗产", "FATE & LEGACY")}
        <p style="font-family:var(--serif);font-size:12.5px;line-height:2;color:#31281e">${esc(item.fate)}</p>
        <div class="dossier-callout">
          <div><span>COUNTRY / 国别</span><b>${esc(item.country)}</b></div>
          <div><span>ROLE / 身份</span><b>${esc(item.role)}</b></div>
          <div><span>LIFE / 生卒</span><b>${esc(item.years)}</b></div>
        </div>
      </div>
      <aside class="dossier-side">
        ${radarCard(item, "FIGURES PROFILE / 人物六维")}
        <div class="dossier-fate"><span>FATE / 结局</span><p>${esc(item.fate)}</p></div>
        <div class="side-note">“争议”维度越高，表示历史评价分歧越大或战争责任越重；它不是负面能力，也不是对暴行的量化。人物雷达不能替代对具体行为的历史判断。</div>
      </aside>
    </div>
    ${dossierFooter(item, "person")}`;
  }
  function countryDossier(item, imageItem = item) {
    return `<div class="dossier-grid">
      <div class="dossier-main">
        ${dossierSection("国家档案", "THE NATION")}
        <div class="dossier-body">${paragraphs(item.body)}</div>
        ${dossierSection("战争努力", "WAR EFFORT")}
        <div class="dossier-tags" style="margin-bottom:12px">${(item.warEffort || []).map((x) => `<span>${esc(x)}</span>`).join("")}</div>
        <p style="font-family:var(--serif);font-size:12.5px;line-height:2;color:#31281e">${esc(item.turning)}</p>
        <div class="dossier-callout">
          <div><span>POPULATION / 人口</span><b>${esc(item.population)}</b></div>
          <div><span>MOBILIZED / 动员</span><b>${esc(item.mobilized)}</b></div>
          <div><span>DEATHS / 死亡</span><b>${esc(item.deaths)}</b></div>
        </div>
        ${dossierSection("国家数据", "NATIONAL DATA")}
        ${specTable([["国名", item.name], ["首都 / 战时中心", item.capital], ["领导人", item.leader], ["参战", item.entry], ["终战", item.exit]])}
      </div>
      <aside class="dossier-side">
        ${radarCard(item, "NATIONAL POWER / 国力六维")}
        <div class="side-note">国力雷达综合工业、军力、动员、科技、韧性与外交。它是叙事性比较，不包含具体年份的战场损失与占领状态。</div>
      </aside>
    </div>
    ${dossierFooter(item, "country", imageItem)}`;
  }
  function eventDossier(item) {
    return `<div class="dossier-grid">
      <div class="dossier-main">
        ${dossierSection("事件档案", "THE RECORD")}
        <div class="dossier-body">${paragraphs(item.body)}</div>
        ${dossierSection("为何重要", "SIGNIFICANCE")}
        <p style="font-family:var(--serif);font-size:12.5px;line-height:2;color:#31281e">${esc(item.significance)}</p>
        ${item.quote ? `<div class="dossier-quote">${esc(item.quote)}<small>WAR ARCHIVE / 档案摘录</small></div>` : ""}
        ${dossierSection("事件信息", "EVENT DATA")}
        ${specTable([["时间", item.date], ["地点", item.place], ["类型", item.type], ["档案编号", item.code]])}
      </div>
      <aside class="dossier-side">
        <div class="radar-card">
          <div class="radar-card__head"><div><b>CONTEXT / 历史语境</b>DECLASSIFIED</div><span class="radar-card__badge">${esc(item.code.split("-")[1] || "01")}</span></div>
          <div style="padding:16px 0 8px;position:relative;z-index:1">
            <p style="font-family:var(--serif);font-size:11px;line-height:1.9;color:#b7a98e">${esc(item.summary)}</p>
          </div>
          <div class="radar-card__foot"><span>EVENT FILE / ${esc(item.type)}</span><span>OPEN ACCESS</span></div>
        </div>
        <div class="side-note">事件档案强调因果与争议，不把复杂历史压缩成单一结论。数字与责任判断请结合页面底部资料来源交叉阅读。</div>
      </aside>
    </div>
    ${dossierFooter(item, "event")}`;
  }
  function dossierHeroLead(item, type) {
    if (type === "battle") return item.summary;
    if (type === "equipment") return item.intro;
    if (type === "person") return item.intro;
    if (type === "country") return item.intro;
    return item.summary;
  }
  function dossierFacts(item, type) {
    if (type === "battle") return `<span><b>DATE</b> ${esc(item.date)}</span><span><b>PLACE</b> ${esc(item.place)}</span><span><b>RESULT</b> ${esc(item.result)}</span>`;
    if (type === "equipment") return `<span><b>ORIGIN</b> ${esc(item.country)}</span><span><b>CLASS</b> ${esc(item.category)}</span><span><b>SERVICE</b> ${esc(item.years)}</span>`;
    if (type === "person") return `<span><b>COUNTRY</b> ${esc(item.country)}</span><span><b>ROLE</b> ${esc(item.role)}</span><span><b>LIFE</b> ${esc(item.years)}</span>`;
    if (type === "country") return `<span><b>CAPITAL</b> ${esc(item.capital)}</span><span><b>SIDE</b> ${sideText(item.faction)}</span><span><b>ENTRY</b> ${esc(item.entry)}</span>`;
    return `<span><b>DATE</b> ${esc(item.date)}</span><span><b>PLACE</b> ${esc(item.place)}</span><span><b>TYPE</b> ${esc(item.type)}</span>`;
  }
  function openDossier(type, id, push = true) {
    const item = { battle: battlesById, equipment: byId(D.equipment), person: peopleById, country: countriesById, event: eventsById }[type]?.get(id);
    if (!item) return;
    const lead = dossierHeroLead(item, type);
    const mediaItem = type === "country" ? (peopleById.get(item.leaderId) || item) : item;
    const body = type === "battle" ? battleDossier(item)
      : type === "equipment" ? equipmentDossier(item)
      : type === "person" ? personDossier(item)
      : type === "country" ? countryDossier(item, mediaItem)
      : eventDossier(item);
    const content = dossierTop(item, type) + dossierHero(item, type, lead, dossierFacts(item, type), mediaItem) + body;
    $("#dossier-content").innerHTML = content;
    $("#dossier-overlay").classList.add("is-open");
    $("#dossier-overlay").setAttribute("aria-hidden", "false");
    $("#dossier-scroll").scrollTop = 0;
    state.dossierOpen = true;
    state.lastFocus = document.activeElement;
    document.body.classList.add("is-locked");
    syncLock();
    if (push) {
      try { history.replaceState(null, "", `?file=${type}-${id}`); } catch (e) { /* file:// can reject */ }
    }
    setTimeout(() => $("#dossier-close").focus(), 80);
  }
  function closeDossier() {
    state.dossierOpen = false;
    $("#dossier-overlay").classList.remove("is-open");
    $("#dossier-overlay").setAttribute("aria-hidden", "true");
    syncLock();
    try { history.replaceState(null, "", location.pathname + (location.hash || "")); } catch (e) { /* noop */ }
    if (state.lastFocus && document.contains(state.lastFocus)) state.lastFocus.focus();
  }
  function initDossier() {
    $("#dossier-close").addEventListener("click", closeDossier);
    $("#dossier-overlay").addEventListener("click", (e) => { if (e.target === $("#dossier-overlay")) closeDossier(); });
    document.addEventListener("click", (e) => {
      const direct = e.target.closest("[data-open-type][data-open-id]");
      if (direct) {
        e.preventDefault();
        openDossier(direct.dataset.openType, direct.dataset.openId);
        return;
      }
      const card = e.target.closest("[data-file-type][data-file-id]");
      if (card) {
        openDossier(card.dataset.fileType, card.dataset.fileId);
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (state.dossierOpen) closeDossier();
        else if (state.searchOpen) closeSearch();
        else if (state.mobileOpen) closeMobile();
      }
      if (e.key === "Tab" && state.dossierOpen) {
        const focusables = $$('button, a[href], input, [tabindex]:not([tabindex="-1"])', $("#dossier-overlay")).filter((el) => el.offsetParent !== null);
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ------------------------------------------------------------
     Sound: subtle radio room ambience
     ------------------------------------------------------------ */
  function initSound() {
    const btn = $("#sound-toggle");
    btn.addEventListener("click", async () => {
      if (!state.audio) {
        try {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx) throw new Error("no audio");
          const ctx = new Ctx();
          const master = ctx.createGain();
          master.gain.value = 0;
          master.connect(ctx.destination);
          const drone = ctx.createOscillator();
          drone.type = "sine";
          drone.frequency.value = 52;
          const droneGain = ctx.createGain();
          droneGain.gain.value = .035;
          drone.connect(droneGain).connect(master);
          const overtone = ctx.createOscillator();
          overtone.type = "triangle";
          overtone.frequency.value = 78;
          const overtoneGain = ctx.createGain();
          overtoneGain.gain.value = .008;
          overtone.connect(overtoneGain).connect(master);
          const noise = ctx.createBufferSource();
          const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * .36;
          noise.buffer = buffer;
          noise.loop = true;
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = 480;
          const noiseGain = ctx.createGain();
          noiseGain.gain.value = .035;
          noise.connect(filter).connect(noiseGain).connect(master);
          const lfo = ctx.createOscillator();
          lfo.frequency.value = .07;
          const lfoGain = ctx.createGain();
          lfoGain.gain.value = 90;
          lfo.connect(lfoGain).connect(filter.frequency);
          drone.start(); overtone.start(); noise.start(); lfo.start();
          state.audio = { ctx, master };
          await ctx.resume();
        } catch (e) {
          toast("此浏览器无法启用环境音");
          return;
        }
      }
      state.soundOn = !state.soundOn;
      try {
        if (state.soundOn) {
          await state.audio.ctx.resume();
          state.audio.master.gain.linearRampToValueAtTime(.7, state.audio.ctx.currentTime + 1.4);
        } else {
          state.audio.master.gain.linearRampToValueAtTime(0, state.audio.ctx.currentTime + .6);
        }
      } catch (e) { /* noop */ }
      btn.setAttribute("aria-pressed", String(state.soundOn));
      $(".sound-label", btn).textContent = state.soundOn ? "SOUND ON" : "SOUND OFF";
      btn.setAttribute("aria-label", state.soundOn ? "关闭环境音" : "开启环境音");
      toast(state.soundOn ? "环境音已开启 / 低频无线电室" : "环境音已关闭");
    });
  }

  /* ------------------------------------------------------------
     Navigation, scroll, reveal, counters, misc
     ------------------------------------------------------------ */
  function syncLock() {
    document.body.classList.toggle("is-locked", state.dossierOpen || state.searchOpen || state.mobileOpen);
  }
  function openMobile() {
    state.mobileOpen = true;
    $("#mobile-menu").classList.add("is-open");
    $("#mobile-menu").setAttribute("aria-hidden", "false");
    $("#menu-open").setAttribute("aria-expanded", "true");
    syncLock();
  }
  function closeMobile() {
    state.mobileOpen = false;
    $("#mobile-menu").classList.remove("is-open");
    $("#mobile-menu").setAttribute("aria-hidden", "true");
    $("#menu-open").setAttribute("aria-expanded", "false");
    syncLock();
  }
  function initNav() {
    $("#menu-open").addEventListener("click", openMobile);
    $("#menu-close").addEventListener("click", closeMobile);
    $$("#mobile-menu a").forEach((a) => a.addEventListener("click", closeMobile));
    const sections = ["top", "overview", "timeline", "battles", "equipment", "people", "countries", "events", "situation", "legacy"].map((id) => document.getElementById(id)).filter(Boolean);
    const navLinks = $$(".main-nav a");
    const railLinks = $$(".chapter-rail a");
    const setActive = (id) => {
      navLinks.forEach((a) => a.classList.toggle("is-active", a.dataset.nav === id));
      railLinks.forEach((a) => a.classList.toggle("is-active", a.dataset.sectionDot === id));
    };
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      }, { rootMargin: "-38% 0px -52% 0px", threshold: [0, .05, .2, .5] });
      sections.forEach((s) => io.observe(s));
    }
    const header = $("#site-header");
    const progress = $("#header-progress");
    const onScroll = () => {
      const y = window.scrollY;
      header.classList.toggle("is-scrolled", y > 24);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? Math.min(100, y / h * 100) : 0) + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
  function initReveal() {
    const els = $$(".reveal");
    if (!("IntersectionObserver" in window) || reduceMotion) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const siblings = Array.from(el.parentElement ? el.parentElement.children : []).filter((x) => x.classList.contains("reveal"));
        const index = Math.max(0, siblings.indexOf(el));
        el.style.transitionDelay = Math.min(index * 70, 350) + "ms";
        el.classList.add("is-in");
        io.unobserve(el);
      });
    }, { threshold: .06, rootMargin: "0px 0px -8% 0px" });
    els.forEach((el) => io.observe(el));
  }
  function initCounters() {
    const counters = $$("[data-count]");
    if (!counters.length) return;
    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const decimals = (el.dataset.count.split(".")[1] || "").length;
      const suffix = el.dataset.suffix || "";
      const duration = reduceMotion ? 0 : 1200;
      const start = performance.now();
      const tick = (now) => {
        const p = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const value = target * eased;
        el.textContent = decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString("zh-CN");
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = decimals ? target.toFixed(decimals) : Math.round(target).toLocaleString("zh-CN");
      };
      requestAnimationFrame(tick);
    };
    if (!("IntersectionObserver" in window)) { counters.forEach(run); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: .5 });
    counters.forEach((el) => io.observe(el));
  }
  function initTicker() {
    const track = $("#ticker-track");
    if (!track) return;
    track.innerHTML += track.innerHTML;
  }
  function initCursor() {
    if (window.matchMedia("(pointer:fine)").matches) {
      const glow = $(".cursor-glow");
      let x = 0, y = 0, tx = 0, ty = 0;
      window.addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; });
      const loop = () => {
        x += (tx - x) * .12; y += (ty - y) * .12;
        glow.style.transform = `translate(${x - 260}px,${y - 260}px)`;
        requestAnimationFrame(loop);
      };
      loop();
    }
  }
  function initGlobe() {
    if (!window.WarGlobe || !$("#globe-canvas")) return;
    window.WarGlobe.init({
      canvas: $("#globe-canvas"),
      stage: $("#globe-stage"),
      tooltip: $("#globe-tooltip"),
      onOpen: (type, id) => openDossier(type, id)
    });
    $$("[data-marker]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const [type, ...rest] = btn.dataset.marker.split("-");
        const mapType = type === "battle" ? "battle" : type === "event" ? "event" : type;
        openDossier(mapType, rest.join("-"));
      });
    });
    $$("[data-globe-action]").forEach((btn) => {
      btn.addEventListener("click", () => window.WarGlobe.action(btn.dataset.globeAction));
    });
    $("#hero-play")?.addEventListener("click", () => {
      state.tourOn = !state.tourOn;
      window.WarGlobe.toggleTour(state.tourOn);
      $("#hero-play").innerHTML = state.tourOn ? '<span>暂停自动巡航</span><i>Ⅱ</i>' : '<span>自动巡航地球</span><i>◉</i>';
    });
  }
  function initExhibit() {
    if (!window.WarExhibit || !$("#exhibit-canvas")) return;
    window.WarExhibit.init({
      canvas: $("#exhibit-canvas"),
      wrap: $(".exhibit__stage-wrap"),
      callouts: $("#exhibit-callouts"),
      onModel: (data) => {
        $("#exhibit-name").textContent = data.name;
        $("#exhibit-en").textContent = data.en;
        $("#exhibit-desc").textContent = data.desc;
        $("#exhibit-status").textContent = data.status;
        $("#exhibit-specs").innerHTML = data.specs.map((s) => `<div><span>${esc(s[0])}</span><b>${esc(s[1])}</b></div>`).join("");
        $("#exhibit-open").dataset.fileType = "equipment";
        $("#exhibit-open").dataset.fileId = data.id;
        const order = ["t34", "tiger", "spitfire", "yamato"].indexOf(data.id);
        const counter = $(".exhibit__head span:last-child");
        if (counter && order >= 0) counter.textContent = `0${order + 1} / 04`;
      }
    });
    $$("#exhibit-tabs button").forEach((b) => {
      b.addEventListener("click", () => {
        $$("#exhibit-tabs button").forEach((x) => x.classList.remove("is-active"));
        b.classList.add("is-active");
        window.WarExhibit.setModel(b.dataset.exhibit);
      });
    });
    $("#exhibit-wire").addEventListener("click", () => {
      const on = window.WarExhibit.toggleWireframe();
      $("#exhibit-wire").innerHTML = on ? '实体模式 <span>◆</span>' : '蓝图模式 <span>◇</span>';
    });
    $("#exhibit-open").addEventListener("click", () => {
      const id = $("#exhibit-open").dataset.fileId;
      if (id) openDossier("equipment", id);
    });
  }
  function initSituation() {
    renderSituationYears();
    if (window.SituationMap && $("#situation-map")) {
      window.SituationMap.init($("#situation-map"));
    }
    renderSituation();
  }
  function renderSources() {
    $("#sources-list").innerHTML = D.sources.map((s, i) => `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} <span>${String(i + 1).padStart(2, "0")} ↗</span></a>`).join("");
  }
  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("is-visible"), 2600);
  }
  function initPreloader() {
    let p = 0;
    const bar = $("#preload-bar"), pct = $("#preload-pct"), pre = $("#preloader");
    const timer = setInterval(() => {
      p = Math.min(96, p + Math.random() * 9 + 3);
      bar.style.width = p + "%";
      pct.textContent = String(Math.round(p)).padStart(2, "0") + "%";
    }, 75);
    const done = () => {
      clearInterval(timer);
      p = 100;
      bar.style.width = "100%";
      pct.textContent = "100%";
      setTimeout(() => {
        pre.classList.add("is-done");
        document.body.classList.add("is-ready");
      }, 280);
    };
    if (document.readyState === "complete") setTimeout(done, 700);
    else window.addEventListener("load", () => setTimeout(done, 500), { once: true });
    setTimeout(done, 2600);
  }
  function initHeroEntrance() {
    $$(".hero .reveal").forEach((el, i) => {
      el.style.transitionDelay = 120 + i * 90 + "ms";
      setTimeout(() => el.classList.add("is-in"), 900 + i * 80);
    });
  }
  function init() {
    initPreloader();
    renderTimeline();
    renderBattles();
    renderEquipment();
    renderPeople();
    renderCountries();
    renderEvents();
    renderSources();
    initFilters();
    initSearch();
    initDossier();
    initNav();
    initReveal();
    initCounters();
    initTicker();
    initCursor();
    initSound();
    initSituation();
    initGlobe();
    initExhibit();
    initHeroEntrance();
    const params = new URLSearchParams(location.search);
    const file = params.get("file");
    if (file) {
      const firstDash = file.indexOf("-");
      if (firstDash > 0) setTimeout(() => openDossier(file.slice(0, firstDash), file.slice(firstDash + 1), false), 700);
    }
    // expose a small API for debugging and deep-links
    window.WarArchive = { open: openDossier, close: closeDossier, search: openSearch, data: D };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
