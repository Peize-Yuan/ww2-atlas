/* ============================================================
   WAR ARCHIVE — interactive 3D war-room globe (Three.js r128)
   ============================================================ */
window.WarGlobe = (() => {
  "use strict";
  let W = null;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function glowTexture(rgb = "209,154,74") {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, `rgba(${rgb},.95)`);
    g.addColorStop(.2, `rgba(${rgb},.45)`);
    g.addColorStop(.65, `rgba(${rgb},.08)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }

  function markerTexture(rgb = "212,83,58") {
    const c = document.createElement("canvas");
    c.width = c.height = 96;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, 96, 96);
    ctx.strokeStyle = `rgba(${rgb},.55)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(48, 48, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(${rgb},.28)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(48, 48, 33, 0, Math.PI * 2);
    ctx.stroke();
    const g = ctx.createRadialGradient(48, 48, 0, 48, 48, 17);
    g.addColorStop(0, "rgba(255,244,212,.95)");
    g.addColorStop(.13, `rgba(${rgb},1)`);
    g.addColorStop(.58, `rgba(${rgb},.55)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(48, 48, 18, 0, Math.PI * 2);
    ctx.fill();
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }

  function ringTexture(rgb = "212,83,58") {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    ctx.strokeStyle = `rgba(${rgb},.7)`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(64, 64, 43, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(${rgb},.2)`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(64, 64, 45, 0, Math.PI * 2);
    ctx.stroke();
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }

  function latLon(lat, lon, radius) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  function init(opts) {
    const canvas = opts.canvas;
    if (!canvas || !window.THREE) return;
    const stage = opts.stage;
    const tooltip = opts.tooltip;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch (err) {
      const fallback = document.getElementById("globe-fallback");
      if (fallback) fallback.hidden = false;
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    if ("outputEncoding" in renderer) renderer.outputEncoding = THREE.sRGBEncoding;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
    camera.position.set(0, .55, 8.9);

    const globe = new THREE.Group();
    globe.position.set(1.15, .12, 0);
    scene.add(globe);
    const front = new THREE.Vector3(0, 0, 1);
    const initialQuat = new THREE.Quaternion().setFromUnitVectors(
      latLon(34, 18, 1).normalize(), front
    );
    globe.quaternion.copy(initialQuat);

    const radius = 2.15;
    const textures = {};
    const loader = new THREE.TextureLoader();
    textures.earth = loader.load("assets/images/earth_atmos_2048.jpg", (tex) => {
      if ("encoding" in tex) tex.encoding = THREE.sRGBEncoding;
      tex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    });
    const earthMat = new THREE.MeshPhongMaterial({
      map: textures.earth,
      color: 0x7d7361,
      emissive: 0x080604,
      specular: 0x17130e,
      shininess: 4
    });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 96), earthMat);
    globe.add(earth);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.025, 64, 64),
      new THREE.ShaderMaterial({
        vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader: "varying vec3 vN; void main(){ float rim = pow(max(0.0, 0.58 - dot(vN, vec3(0.0,0.0,1.0))), 2.2); gl_FragColor = vec4(0.86, 0.61, 0.29, rim * .78); }",
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false
      })
    );
    globe.add(atmosphere);

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture("209,154,74"),
      color: 0xb7803b,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity: .25
    }));
    halo.scale.set(7.5, 7.5, 1);
    halo.position.z = -.7;
    globe.add(halo);

    // graticule
    const gridMat = new THREE.LineBasicMaterial({ color: 0x99835d, transparent: true, opacity: .17, depthWrite: false });
    const grid = new THREE.Group();
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts = [];
      for (let lon = -180; lon <= 180; lon += 4) pts.push(latLon(lat, lon, radius * 1.002));
      grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
    for (let lon = -180; lon < 180; lon += 30) {
      const pts = [];
      for (let lat = -90; lat <= 90; lat += 4) pts.push(latLon(lat, lon, radius * 1.002));
      grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
    globe.add(grid);

    // orbital rings
    const orbitMat = new THREE.LineBasicMaterial({ color: 0xd19a4a, transparent: true, opacity: .22, depthWrite: false });
    [2.72, 2.92].forEach((r, i) => {
      const pts = [];
      for (let a = 0; a <= Math.PI * 2 + .05; a += .04) pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * (i ? .34 : 1), Math.sin(a) * r * (i ? .3 : 0)));
      globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), orbitMat));
    });

    // lights
    scene.add(new THREE.AmbientLight(0x86765e, .48));
    const key = new THREE.DirectionalLight(0xffd49a, .82);
    key.position.set(-4, 3.5, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x5b8a9d, .58);
    rim.position.set(5, 1, -4);
    scene.add(rim);
    const bounce = new THREE.PointLight(0xd15b30, .28, 9);
    bounce.position.set(-3, -2, 2);
    scene.add(bounce);

    // stars / dust
    const starCount = 520;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 7 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      starPos[i * 3 + 1] = Math.cos(phi) * r * .65;
      starPos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xb5a184, size: .028, transparent: true, opacity: .62, depthWrite: false, sizeAttenuation: true
    }));
    scene.add(stars);

    // markers
    const markerGroup = new THREE.Group();
    globe.add(markerGroup);
    const markerSprites = [];
    const markerMap = new Map();
    const colors = { axis: "212,83,58", allied: "147,182,194", event: "209,154,74", neutral: "209,154,74" };
    const tex = {
      axis: markerTexture(colors.axis),
      allied: markerTexture(colors.allied),
      event: markerTexture(colors.event)
    };
    const ringKeys = new Set(["stalingrad", "normandy", "midway", "pearl", "berlin", "elalamein"]);
    const haloRing = {
      axis: ringTexture(colors.axis),
      allied: ringTexture(colors.allied),
      event: ringTexture(colors.event)
    };

    function addMarker(type, item, lat, lon, category) {
      const pos = latLon(lat, lon, radius * 1.012);
      const mat = new THREE.SpriteMaterial({
        map: tex[category] || tex.event,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        opacity: .96
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(pos);
      sprite.scale.set(.17, .17, 1);
      sprite.userData = { type, id: item.id, name: item.name, item, category, baseScale: .17, phase: Math.random() * Math.PI * 2 };
      markerGroup.add(sprite);
      markerSprites.push(sprite);
      markerMap.set(`${type}-${item.id}`, sprite);

      if (ringKeys.has(item.id)) {
        const ring = new THREE.Sprite(new THREE.SpriteMaterial({
          map: haloRing[category] || haloRing.event,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          opacity: .26
        }));
        ring.position.copy(pos.clone().multiplyScalar(1.001));
        ring.scale.set(.42, .42, 1);
        ring.userData = { marker: sprite, baseScale: .42, phase: sprite.userData.phase };
        markerGroup.add(ring);
        sprite.userData.ring = ring;
      }
    }

    (window.WW2.battles || []).forEach((b) => {
      if (!b.coords) return;
      const axisVictory = /^(德国|日本|德苏)/.test(b.result);
      addMarker("battle", b, b.coords[0], b.coords[1], axisVictory ? "axis" : "allied");
    });
    (window.WW2.events || []).forEach((e) => {
      if (!e.coords) return;
      addMarker("event", e, e.coords[0], e.coords[1], "event");
    });

    // arcs: alliance / supply lines
    const arcs = [
      { from: [38.9, -77.0], to: [51.5, -0.12], color: 0xd9a65c, speed: .035 },
      { from: [51.5, -0.12], to: [55.75, 37.62], color: 0x9ab7c0, speed: .028 },
      { from: [55.75, 37.62], to: [29.56, 106.55], color: 0xd9a65c, speed: .022 },
      { from: [21.35, -157.95], to: [28.2, -177.37], color: 0x9ab7c0, speed: .045 },
      { from: [28.2, -177.37], to: [35.68, 139.69], color: 0xd9a65c, speed: .032 },
      { from: [51.5, -0.12], to: [30.83, 28.95], color: 0x9ab7c0, speed: .026 }
    ];
    const arcObjects = [];
    arcs.forEach((arc, ai) => {
      const a = latLon(arc.from[0], arc.from[1], radius * 1.008);
      const b = latLon(arc.to[0], arc.to[1], radius * 1.008);
      const mid = a.clone().add(b).multiplyScalar(.5).normalize().multiplyScalar(radius * 1.38);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const points = curve.getPoints(72);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: arc.color, transparent: true, opacity: .22, depthWrite: false })
      );
      globe.add(line);
      const dot = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture(ai % 2 ? "147,182,194" : "209,154,74"),
        color: arc.color,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: .8
      }));
      dot.scale.set(.28, .28, 1);
      globe.add(dot);
      arcObjects.push({ curve, dot, speed: arc.speed, offset: Math.random() });
    });

    // postprocessing (subtle bloom)
    // Direct rendering keeps the map legible; the aura and marker sprites
    // already provide the glow without washing out the continents.
    let composer = null;

    const clock = new THREE.Clock();
    const pointer = new THREE.Vector2(-10, -10);
    const raycaster = new THREE.Raycaster();
    let hovered = null;
    let dragging = false;
    let dragMoved = 0;
    let lastX = 0, lastY = 0;
    let lastPointerX = 0, lastPointerY = 0;
    let targetQuat = initialQuat.clone();
    let currentQuat = initialQuat.clone();
    const autoSpin = new THREE.Quaternion();
    let autoRotate = !reduceMotion;
    let baseDistance = 8.9;
    let targetDistance = baseDistance;
    let running = true;
    let tourTimer = null;
    let tourIndex = 0;
    const tourIds = ["battle-stalingrad", "battle-normandy", "battle-midway", "battle-berlin", "battle-elalamein", "event-yalta"];

    function layout() {
      const rect = stage.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const mobile = w < 760;
      renderer.setSize(w, h, false);
      if (composer) composer.setSize(w, h);
      camera.aspect = w / h;
      baseDistance = mobile ? 8.4 : 8.9;
      targetDistance = Math.min(targetDistance, mobile ? 9.5 : 10.5);
      camera.position.z = targetDistance;
      globe.position.x = w > 1150 ? 1.2 : w > 760 ? .55 : .15;
      globe.position.y = w > 760 ? .12 : .7;
      camera.updateProjectionMatrix();
    }
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(stage);

    function normalizeAngle(a) {
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      return a;
    }
    function focusMarker(key, open = false) {
      const sprite = markerMap.get(key);
      if (!sprite) return;
      const item = sprite.userData.item;
      if (!item.coords) return;
      const local = latLon(item.coords[0], item.coords[1], 1).normalize();
      targetQuat.copy(new THREE.Quaternion().setFromUnitVectors(local, front));
      autoRotate = false;
      if (open) {
        opts.onOpen(sprite.userData.type, sprite.userData.id);
      }
    }

    function pick(e) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const candidates = markerSprites.filter((s) => s.visible);
      const hits = raycaster.intersectObjects(candidates, false);
      return hits.length ? hits[0].object : null;
    }

    function showTooltip(sprite, e) {
      if (!sprite) {
        tooltip.classList.remove("is-visible");
        return;
      }
      const d = sprite.userData;
      const item = d.item;
      tooltip.querySelector(".globe-tooltip__type").textContent = d.type === "battle" ? "BATTLE / 战役" : "EVENT / 事件";
      tooltip.querySelector("b").textContent = item.name;
      tooltip.querySelector("small").textContent = (item.date || "") + " · " + (item.place || "");
      const rect = stage.getBoundingClientRect();
      tooltip.style.left = Math.max(8, Math.min(rect.width - 170, e.clientX - rect.left)) + "px";
      tooltip.style.top = Math.max(24, e.clientY - rect.top) + "px";
      tooltip.classList.add("is-visible");
    }

    function pointerDown(e) {
      dragging = true;
      dragMoved = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      autoRotate = false;
      canvas.setPointerCapture?.(e.pointerId);
    }
    function pointerMove(e) {
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      if (dragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        dragMoved += Math.abs(dx) + Math.abs(dy);
        const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * .006);
        const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * .004);
        targetQuat.premultiply(qy).premultiply(qx).normalize();
        lastX = e.clientX;
        lastY = e.clientY;
        tooltip.classList.remove("is-visible");
        return;
      }
      const hit = pick(e);
      if (hit !== hovered) {
        hovered = hit;
        canvas.style.cursor = hit ? "pointer" : "grab";
      }
      showTooltip(hovered, e);
    }
    function pointerUp(e) {
      const wasDrag = dragMoved > 7;
      dragging = false;
      try { canvas.releasePointerCapture?.(e.pointerId); } catch (err) { /* noop */ }
      if (!wasDrag) {
        const hit = pick(e);
        if (hit) {
          const d = hit.userData;
          opts.onOpen(d.type, d.id);
          tooltip.classList.remove("is-visible");
        }
      }
    }
    function pointerLeave() {
      dragging = false;
      tooltip.classList.remove("is-visible");
    }
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointerleave", pointerLeave);
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? 1 : -1;
      targetDistance = Math.max(5.8, Math.min(11.8, targetDistance + dir * .45));
      autoRotate = false;
    }, { passive: false });

    const io = new IntersectionObserver((entries) => {
      running = entries[0]?.isIntersecting ?? true;
    }, { threshold: 0 });
    io.observe(stage);

    function tick() {
      requestAnimationFrame(tick);
      if (!running) return;
      const t = clock.getElapsedTime();
      if (autoRotate && !dragging) {
        autoSpin.setFromAxisAngle(new THREE.Vector3(0, 1, 0), .00125);
        targetQuat.premultiply(autoSpin).normalize();
      }
      currentQuat.slerp(targetQuat, .055);
      globe.quaternion.copy(currentQuat);
      camera.position.z += (targetDistance - camera.position.z) * .08;
      camera.lookAt(0, 0, 0);
      stars.rotation.y = t * .004;
      stars.rotation.x = Math.sin(t * .03) * .04;
      halo.material.opacity = .46 + Math.sin(t * .6) * .07;
      grid.rotation.y = t * .004;
      // markers pulse and visibility
      const camPos = camera.position;
      markerSprites.forEach((s) => {
        const wp = s.getWorldPosition(new THREE.Vector3());
        const normal = wp.clone().sub(globe.position).normalize();
        const toCam = camPos.clone().sub(wp).normalize();
        const facing = normal.dot(toCam);
        s.visible = facing > .1;
        const ring = s.userData.ring;
        if (ring) {
          ring.visible = s.visible;
          ring.position.copy(s.position);
        }
        if (s.visible) {
          const pulse = 1 + Math.sin(t * 2.2 + s.userData.phase) * .08;
          const targetScale = (hovered === s ? .23 : .17) * pulse;
          s.scale.x += (targetScale - s.scale.x) * .18;
          s.scale.y = s.scale.x;
          if (ring) {
            ring.scale.x = .42 + Math.sin(t * 1.4 + s.userData.phase) * .05;
            ring.scale.y = ring.scale.x;
            ring.material.opacity = .18 + Math.sin(t * 1.4 + s.userData.phase) * .08;
          }
        }
      });
      // animated route dots
      arcObjects.forEach((a) => {
        const u = (t * a.speed + a.offset) % 1;
        a.dot.position.copy(a.curve.getPoint(u));
        a.dot.material.opacity = .5 + Math.sin(u * Math.PI) * .45;
      });
      // show tooltip position remains event driven
      if (composer) composer.render();
      else renderer.render(scene, camera);
    }
    tick();

    W = {
      focus(key) { focusMarker(key); },
      setView(lat, lon) { const local = latLon(lat, lon, 1).normalize(); const q = new THREE.Quaternion().setFromUnitVectors(local, front); targetQuat.copy(q); currentQuat.copy(q); autoRotate = false; },
      action(name) {
        if (name === "zoom-in") { targetDistance = Math.max(5.8, targetDistance - .7); autoRotate = false; }
        if (name === "zoom-out") { targetDistance = Math.min(11.8, targetDistance + .7); autoRotate = false; }
        if (name === "reset") { targetDistance = 8.9; targetQuat.copy(initialQuat); autoRotate = !reduceMotion; }
        if (name === "toggle-rotate") {
          autoRotate = !autoRotate;
          const b = document.querySelector('[data-globe-action="toggle-rotate"]');
          if (b) b.textContent = autoRotate ? "Ⅱ" : "▶";
        }
      },
      toggleTour(on) {
        if (tourTimer) { clearInterval(tourTimer); tourTimer = null; }
        autoRotate = false;
        if (!on) return;
        const go = () => {
          const id = tourIds[tourIndex % tourIds.length];
          focusMarker(id);
          tourIndex++;
        };
        go();
        tourTimer = setInterval(go, 4200);
      },
      resize: layout
    };
  }

  return {
    init,
    action(name) { if (W) W.action(name); },
    toggleTour(on) { if (W) W.toggleTour(on); },
    focus(key) { if (W) W.focus(key); },
    setView(lat, lon) { if (W) W.setView(lat, lon); }
  };
})();
