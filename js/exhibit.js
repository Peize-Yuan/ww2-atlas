/* ============================================================
   WAR ARCHIVE — 3D ordnance lab (Three.js r128)
   Procedural, low-poly, museum-blueprint style.
   ============================================================ */
window.WarExhibit = (() => {
  "use strict";
  let app = null;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function radialShadowTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(0,0,0,.55)");
    g.addColorStop(.5, "rgba(0,0,0,.25)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function buildScene(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.setClearColor(0x000000, 0);
    if ("outputEncoding" in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
    camera.position.set(0, 2.55, 8.2);
    camera.lookAt(0, .35, 0);

    scene.add(new THREE.HemisphereLight(0xb7a98c, 0x1a150f, .58));
    const key = new THREE.DirectionalLight(0xffd7a0, 1.45);
    key.position.set(4.5, 7, 5.5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x6f98aa, .85);
    rim.position.set(-5, 2.5, -4);
    scene.add(rim);
    const fill = new THREE.PointLight(0xd16a36, .7, 10);
    fill.position.set(-2.8, 1.5, 3.8);
    scene.add(fill);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 15),
      new THREE.MeshBasicMaterial({ map: radialShadowTexture(), transparent: true, opacity: .85, depthWrite: false })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -.83;
    scene.add(floor);

    const grid = new THREE.GridHelper(17, 34, 0x6e5738, 0x2b2318);
    grid.position.y = -.81;
    grid.material.transparent = true;
    grid.material.opacity = .26;
    grid.material.depthWrite = false;
    scene.add(grid);

    [2.2, 3.2, 4.15].forEach((r, i) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r, r + .012, 96),
        new THREE.MeshBasicMaterial({ color: i === 0 ? 0xd19a4a : 0x7d6444, transparent: true, opacity: i === 0 ? .42 : .2, side: THREE.DoubleSide, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -.795;
      scene.add(ring);
    });

    return { renderer, scene, camera, grid };
  }

  function makeMats(colors) {
    const mats = {
      main: new THREE.MeshStandardMaterial({ color: colors.main, roughness: .62, metalness: .32 }),
      dark: new THREE.MeshStandardMaterial({ color: colors.dark, roughness: .78, metalness: .25 }),
      track: new THREE.MeshStandardMaterial({ color: 0x201d18, roughness: .93, metalness: .12 }),
      accent: new THREE.MeshStandardMaterial({ color: colors.accent || 0xd19a4a, roughness: .55, metalness: .55, emissive: 0x2a1b08, emissiveIntensity: .55 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x5c8796, roughness: .25, metalness: .45, transparent: true, opacity: .65 })
    };
    const edge = new THREE.LineBasicMaterial({ color: 0xd7b47a, transparent: true, opacity: .16, depthWrite: false });
    return { mats, edge, all: Object.values(mats) };
  }

  function prepMesh(mesh, ctx, useEdges = true) {
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    if (useEdges) {
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 25), ctx.edge);
      edges.raycast = () => {};
      mesh.add(edges);
    }
    return mesh;
  }

  function box(ctx, parent, w, h, d, x, y, z, mat, rot = null, edges = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    prepMesh(m, ctx, edges);
    parent.add(m);
    return m;
  }
  function cyl(ctx, parent, rTop, rBottom, h, seg, x, y, z, mat, rot = null, edges = true) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg), mat);
    m.position.set(x, y, z);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    prepMesh(m, ctx, edges);
    parent.add(m);
    return m;
  }

  function buildT34(ctx, dark = false) {
    const g = new THREE.Group();
    const colors = { main: 0x5a5d43, dark: 0x31342a, accent: 0xd19a4a };
    const made = makeMats(colors); const mats = made.mats; ctx.edge = made.edge;
    ctx.materials = Object.values(mats);
    // tracks
    [-1.08, 1.08].forEach((z) => {
      box(ctx, g, 4.45, .58, .46, 0, -.35, z, mats.track);
      box(ctx, g, 4.1, .08, .5, 0, -.06, z, mats.dark, null, false);
      for (let i = 0; i < 5; i++) {
        const x = -1.62 + i * .81;
        cyl(ctx, g, .34, .34, .5, 12, x, -.36, z, mats.dark, [Math.PI / 2, 0, 0]);
        cyl(ctx, g, .18, .18, .53, 10, x, -.36, z, mats.main, [Math.PI / 2, 0, 0], false);
      }
    });
    // hull
    box(ctx, g, 3.6, .68, 1.7, 0, .18, 0, mats.main);
    box(ctx, g, 1.3, .16, 1.7, 1.3, .53, 0, mats.main, [0, 0, -.42]);
    box(ctx, g, .8, .25, 1.7, -1.55, .35, 0, mats.main, [0, 0, .12]);
    // turret
    cyl(ctx, g, .67, .89, .48, 12, -.1, .82, 0, mats.main);
    cyl(ctx, g, .4, .4, .12, 16, -.42, 1.08, .18, mats.dark, null, false);
    cyl(ctx, g, .1, .1, 2.05, 12, 1.13, .9, 0, mats.dark, [0, 0, Math.PI / 2]);
    cyl(ctx, g, .16, .16, .22, 12, 2.1, .9, 0, mats.accent, [0, 0, Math.PI / 2]);
    // fuel drums / stowage
    cyl(ctx, g, .18, .18, .78, 12, -1.3, .58, -.55, mats.dark, [0, 0, Math.PI / 2], false);
    cyl(ctx, g, .18, .18, .78, 12, -1.3, .58, .55, mats.dark, [0, 0, Math.PI / 2], false);
    return {
      group: g, mats: ctx.materials, anchors: [
        { label: "76.2 mm F-34", pos: new THREE.Vector3(2.0, .93, 0) },
        { label: "45 mm 倾斜装甲", pos: new THREE.Vector3(1.55, .35, .65) },
        { label: "V-2 柴油机", pos: new THREE.Vector3(-1.65, .35, 0) }
      ]
    };
  }

  function buildTiger(ctx) {
    const g = new THREE.Group();
    const colors = { main: 0x605b48, dark: 0x2d2c24, accent: 0xd19a4a };
    const made = makeMats(colors); const mats = made.mats; ctx.edge = made.edge;
    ctx.materials = Object.values(mats);
    [-1.17, 1.17].forEach((z) => {
      box(ctx, g, 4.75, .64, .55, 0, -.37, z, mats.track);
      for (let i = 0; i < 6; i++) {
        cyl(ctx, g, .35, .35, .58, 12, -1.72 + i * .7, -.37, z, mats.dark, [Math.PI / 2, 0, 0]);
      }
    });
    box(ctx, g, 3.95, .78, 1.86, 0, .18, 0, mats.main);
    box(ctx, g, .92, .12, 1.86, 1.65, .6, 0, mats.main, [0, 0, -.28]);
    box(ctx, g, 1.45, .55, 1.35, .18, .86, 0, mats.main);
    box(ctx, g, .58, .2, .74, -.62, 1.16, .25, mats.dark);
    cyl(ctx, g, .09, .09, 2.45, 12, 1.7, .92, 0, mats.dark, [0, 0, Math.PI / 2]);
    cyl(ctx, g, .19, .19, .3, 12, 2.85, .92, 0, mats.accent, [0, 0, Math.PI / 2]);
    // fenders / hull detail
    [-1.28, 1.28].forEach((z) => box(ctx, g, 4.35, .1, .28, 0, .53, z, mats.dark, null, false));
    box(ctx, g, .6, .22, .42, -.55, 1.2, .3, mats.dark, null, false);
    cyl(ctx, g, .26, .26, .13, 12, .02, 1.22, .28, mats.main, null, false);
    box(ctx, g, .9, .35, 1.2, .82, .92, 0, mats.main, [0, 0, -.18]);
    return {
      group: g, mats: ctx.materials, anchors: [
        { label: "88 mm KwK 36", pos: new THREE.Vector3(2.7, .95, 0) },
        { label: "100 mm 正面装甲", pos: new THREE.Vector3(1.6, .4, .8) },
        { label: "交错负重轮", pos: new THREE.Vector3(-1.2, -.35, 1.35) }
      ]
    };
  }

  function buildSpitfire(ctx) {
    const g = new THREE.Group();
    const colors = { main: 0x77765f, dark: 0x34372d, accent: 0xd19a4a };
    const made = makeMats(colors); const mats = made.mats; ctx.edge = made.edge;
    ctx.materials = Object.values(mats);
    g.rotation.z = 0;
    // fuselage
    const fuselage = cyl(ctx, g, .18, .38, 3.5, 16, -.05, .18, 0, mats.main, [0, 0, Math.PI / 2]);
    fuselage.scale.z = .88;
    cyl(ctx, g, .1, .38, .7, 16, 1.92, .18, 0, mats.main, [0, 0, -Math.PI / 2]);
    // spinner + prop
    const spinner = new THREE.Mesh(new THREE.ConeGeometry(.18, .58, 16), mats.accent);
    spinner.rotation.z = -Math.PI / 2;
    spinner.position.set(2.35, .18, 0);
    prepMesh(spinner, ctx, false);
    g.add(spinner);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(.92, 40), new THREE.MeshBasicMaterial({ color: 0xb9a26f, transparent: true, opacity: .08, side: THREE.DoubleSide, depthWrite: false }));
    disc.rotation.y = Math.PI / 2;
    disc.position.set(2.14, .18, 0);
    g.add(disc);
    for (let i = 0; i < 3; i++) {
      const blade = box(ctx, g, .07, 1.5, .07, 2.12, .18, 0, mats.dark, null, false);
      blade.rotation.x = i * Math.PI * 2 / 3;
    }
    // elliptical wing (both sides)
    const shape = new THREE.Shape();
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      pts.push([-.12 + .95 * Math.cos(a), 2.45 * Math.sin(a)]);
    }
    shape.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach((p) => shape.lineTo(p[0], p[1]));
    const wingGeo = new THREE.ExtrudeGeometry(shape, { depth: .075, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 2 });
    const wing = new THREE.Mesh(wingGeo, mats.main);
    wing.rotation.x = -Math.PI / 2;
    wing.position.set(0, .1, 0);
    prepMesh(wing, ctx, true);
    g.add(wing);
    // tailplane
    const tailShape = new THREE.Shape();
    const tpts = [];
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      tpts.push([-.15 + .7 * Math.cos(a), .95 * Math.sin(a)]);
    }
    tailShape.moveTo(tpts[0][0], tpts[0][1]);
    tpts.slice(1).forEach((p) => tailShape.lineTo(p[0], p[1]));
    const tail = new THREE.Mesh(new THREE.ExtrudeGeometry(tailShape, { depth: .055, bevelEnabled: false }), mats.main);
    tail.rotation.x = -Math.PI / 2;
    tail.position.set(-1.55, .18, 0);
    prepMesh(tail, ctx, true);
    g.add(tail);
    // fin
    box(ctx, g, .46, .9, .07, -1.7, .62, 0, mats.main, [0, 0, -.2]);
    // canopy
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mats.glass);
    canopy.scale.set(1.5, .75, .85);
    canopy.position.set(-.05, .4, 0);
    g.add(canopy);
    // exhausts
    [-.22, .22].forEach((z) => box(ctx, g, .5, .1, .08, .92, .3, z, mats.dark, null, false));
    g.rotation.y = .25;
    g.position.y = .5;
    g.scale.setScalar(.92);
    return {
      group: g, mats: ctx.materials, anchors: [
        { label: "梅林 V12 发动机", pos: new THREE.Vector3(1.72, .38, 0) },
        { label: "椭圆机翼", pos: new THREE.Vector3(-.45, .14, 1.55) },
        { label: "20 mm 机炮", pos: new THREE.Vector3(1.05, .15, 1.05) }
      ]
    };
  }

  function buildYamato(ctx) {
    const g = new THREE.Group();
    const colors = { main: 0x555a55, dark: 0x252d2c, accent: 0xd19a4a };
    const made = makeMats(colors); const mats = made.mats; ctx.edge = made.edge;
    ctx.materials = Object.values(mats);
    // hull
    const hullShape = new THREE.Shape();
    const half = [
      [2.9, 0], [2.45, .42], [1.4, .62], [-1.9, .62], [-2.55, .42], [-2.75, 0]
    ];
    hullShape.moveTo(half[0][0], half[0][1]);
    half.slice(1).forEach((p) => hullShape.lineTo(p[0], p[1]));
    for (let i = half.length - 1; i >= 0; i--) hullShape.lineTo(half[i][0], -half[i][1]);
    const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: .7, bevelEnabled: true, bevelSize: .08, bevelThickness: .08, bevelSegments: 2 });
    const hull = new THREE.Mesh(hullGeo, mats.main);
    hull.rotation.x = -Math.PI / 2;
    hull.position.set(0, -.05, 0);
    prepMesh(hull, ctx, true);
    g.add(hull);
    // deck
    box(ctx, g, 4.8, .12, 1.15, 0, .34, 0, mats.dark, null, true);
    // superstructure
    box(ctx, g, 1.25, .42, .82, -.25, .62, 0, mats.main);
    box(ctx, g, .8, .46, .62, -.35, 1.02, 0, mats.main);
    box(ctx, g, .5, .34, .44, -.42, 1.38, 0, mats.main);
    box(ctx, g, .3, .2, .3, -.5, 1.58, 0, mats.main);
    cyl(ctx, g, .04, .06, 1.55, 8, -.45, 2.12, 0, mats.dark, null, false);
    box(ctx, g, .08, .08, 1.5, -.45, 1.86, 0, mats.dark, null, false);
    cyl(ctx, g, .16, .19, .65, 12, .25, .9, 0, mats.dark);
    box(ctx, g, .55, .25, .38, .42, 1.12, 0, mats.main);
    // main turrets (triple 46cm)
    const turret = (x, dir) => {
      box(ctx, g, .78, .28, .95, x, .55, 0, mats.main);
      cyl(ctx, g, .4, .5, .24, 10, x, .62, 0, mats.main);
      for (let i = -1; i <= 1; i++) {
        cyl(ctx, g, .065, .065, 1.34, 10, x + dir * .86, .66, i * .27, mats.dark, [0, 0, Math.PI / 2]);
        cyl(ctx, g, .11, .11, .16, 10, x + dir * 1.45, .66, i * .27, mats.accent, [0, 0, Math.PI / 2]);
      }
    };
    turret(1.45, 1);
    turret(.78, 1);
    turret(-1.35, -1);
    // secondary turrets
    [-1.8, 1.75].forEach((x) => {
      cyl(ctx, g, .18, .24, .22, 10, x, .58, 0, mats.dark);
      cyl(ctx, g, .035, .035, .72, 8, x + (x > 0 ? .35 : -.35), .62, 0, mats.dark, [0, 0, Math.PI / 2], false);
    });
    // funnel + AA
    box(ctx, g, .35, .4, .3, -.85, 1.28, 0, mats.dark);
    for (let i = 0; i < 4; i++) box(ctx, g, .1, .1, .1, .7 + i * .22, .48, .45, mats.accent, null, false);
    g.position.y = .15;
    g.scale.setScalar(.82);
    return {
      group: g, mats: ctx.materials, anchors: [
        { label: "460 mm 主炮", pos: new THREE.Vector3(2.25, .66, .25) },
        { label: "塔式舰桥", pos: new THREE.Vector3(-.45, 1.85, 0) },
        { label: "410 mm 装甲带", pos: new THREE.Vector3(-1.1, -.02, .55) }
      ]
    };
  }

  const MODELS = {
    t34: {
      name: "T-34 中型坦克", en: "T-34 MEDIUM TANK", status: "T-34 / LIVE MODEL",
      desc: "倾斜装甲、宽履带与柴油机，把坦克设计带进现代。拖动模型，检查它的轮廓与炮塔。",
      specs: [["主炮", "76.2 mm"], ["装甲", "45 mm 倾斜"], ["产量", "84,000+"], ["速度", "53 km/h"]],
      build: buildT34
    },
    tiger: {
      name: "虎式重型坦克", en: "TIGER I", status: "TIGER I / LIVE MODEL",
      desc: "88毫米炮与厚重装甲的化身，也是德国工业极限的化身。它的轮廓比T-34庞大得多。",
      specs: [["主炮", "88 mm KwK 36"], ["装甲", "100—120 mm"], ["产量", "1,347"], ["速度", "45 km/h"]],
      build: buildTiger
    },
    spitfire: {
      name: "喷火式战斗机", en: "SUPERMARINE SPITFIRE", status: "SPITFIRE / LIVE MODEL",
      desc: "椭圆机翼的优雅，不列颠空战的象征。拖动查看机翼的平面形状与机鼻。",
      specs: [["动力", "Merlin 66"], ["速度", "594 km/h"], ["武器", "2×20 mm + 4×.303"], ["产量", "20,351"]],
      build: buildSpitfire
    },
    yamato: {
      name: "大和号战列舰", en: "YAMATO", status: "YAMATO / LIVE MODEL",
      desc: "人类建造过的最重战列舰。拖动查看三座三联装460毫米主炮、塔式舰桥与装甲带。",
      specs: [["主炮", "3 × 3 × 460 mm"], ["排水量", "72,800 t"], ["航速", "27 节"], ["舰长", "263 m"]],
      build: buildYamato
    }
  };

  function init(opts) {
    const canvas = opts.canvas;
    if (!canvas || !window.THREE) return;
    let base;
    try {
      base = buildScene(canvas);
    } catch (e) {
      opts.callouts.innerHTML = '<div style="position:absolute;inset:0;display:grid;place-items:center;color:#8f816b;font:10px monospace">3D PREVIEW UNAVAILABLE</div>';
      return;
    }
    const { renderer, scene, camera } = base;
    const root = new THREE.Group();
    scene.add(root);
    const modelCache = new Map();
    let currentKey = "t34";
    let current = null;
    let wire = false;
    let autoRotate = !reduceMotion;
    let rotateY = .3;
    let targetRotateY = .3;
    let tiltX = .05;
    let targetTiltX = .05;
    let distance = 8.2;
    let targetDistance = 8.2;
    let dragging = false;
    let lastX = 0, lastY = 0;
    let moved = 0;
    let running = true;
    let calloutEls = [];

    function makeCallouts(model) {
      opts.callouts.innerHTML = "";
      calloutEls = model.anchors.map((a) => {
        const el = document.createElement("div");
        el.className = "callout";
        el.innerHTML = `<span class="callout__dot"></span><span class="callout__line"></span><span class="callout__label">${a.label}</span>`;
        opts.callouts.appendChild(el);
        return { el, pos: a.pos };
      });
    }

    function setModel(key) {
      if (!MODELS[key]) return;
      if (current) {
        current.group.visible = false;
      }
      currentKey = key;
      let model = modelCache.get(key);
      if (!model) {
        const ctx = {};
        model = MODELS[key].build(ctx);
        modelCache.set(key, model);
        root.add(model.group);
      }
      model.group.visible = true;
      current = model;
      model.mats.forEach((m) => { if ("wireframe" in m) m.wireframe = wire; });
      makeCallouts(model);
      const data = MODELS[key];
      const equipment = (window.WW2.equipment || []).find((x) => x.id === key);
      opts.onModel({ ...data, id: key, specs: data.specs, equipment });
      rotateY = .3; targetRotateY = .3; tiltX = .05; targetTiltX = .05;
    }

    function layout() {
      const wrap = opts.wrap.getBoundingClientRect();
      const w = Math.max(1, wrap.width), h = Math.max(1, wrap.height);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = distance;
      camera.updateProjectionMatrix();
    }
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(opts.wrap);

    function tick() {
      requestAnimationFrame(tick);
      if (!running || !current) return;
      if (autoRotate && !dragging) targetRotateY += .0028;
      rotateY += (targetRotateY - rotateY) * .07;
      tiltX += (targetTiltX - tiltX) * .07;
      current.group.rotation.y = rotateY;
      current.group.rotation.x = tiltX;
      camera.position.z += (targetDistance - camera.position.z) * .08;
      camera.lookAt(0, .35, 0);
      // callouts
      const rect = opts.wrap.getBoundingClientRect();
      calloutEls.forEach((c) => {
        const v = c.pos.clone();
        current.group.localToWorld(v);
        v.project(camera);
        const visible = v.z < 1 && v.z > -1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15;
        c.el.classList.toggle("is-visible", visible);
        if (!visible) return;
        c.el.style.left = ((v.x + 1) / 2 * rect.width) + "px";
        c.el.style.top = ((-v.y + 1) / 2 * rect.height) + "px";
      });
      renderer.render(scene, camera);
    }
    tick();

    canvas.addEventListener("pointerdown", (e) => {
      dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
      autoRotate = false;
      canvas.setPointerCapture?.(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      targetRotateY += dx * .008;
      targetTiltX = Math.max(-.35, Math.min(.35, targetTiltX + dy * .003));
      lastX = e.clientX; lastY = e.clientY;
    });
    canvas.addEventListener("pointerup", (e) => {
      dragging = false;
      try { canvas.releasePointerCapture?.(e.pointerId); } catch (err) { /* noop */ }
    });
    canvas.addEventListener("pointerleave", () => { dragging = false; });
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      targetDistance = Math.max(4.8, Math.min(10.2, targetDistance + (e.deltaY > 0 ? .38 : -.38)));
      autoRotate = false;
    }, { passive: false });
    const io = new IntersectionObserver((entries) => { running = entries[0]?.isIntersecting ?? true; }, { threshold: 0 });
    io.observe(opts.wrap);

    setModel("t34");

    app = {
      setModel,
      toggleWireframe() {
        wire = !wire;
        if (current) {
          current.mats.forEach((m) => { if ("wireframe" in m) m.wireframe = wire; });
          current.mats.forEach((m) => { if (m.emissive) m.emissiveIntensity = wire ? 1.1 : .55; });
        }
        return wire;
      },
      reveal() {
        setModel(currentKey);
      }
    };
  }

  return {
    init,
    setModel(key) { if (app) app.setModel(key); },
    toggleWireframe() { return app ? app.toggleWireframe() : false; }
  };
})();
