// Motion: GSAP page transitions / count-ups / ring fills, and a three.js particle wave behind the dashboard hero.
// Everything is optional polish — if a library can't load (offline) or the user prefers reduced motion,
// the app renders exactly the same, just without animation.

const GSAP_URL = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js";
const THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

const Motion = {
  reduced: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false,
  _libs: {},

  load(src) {
    return (this._libs[src] ||= new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.onload = res;
      s.onerror = () => rej(new Error("Couldn't load " + src));
      document.head.appendChild(s);
    }));
  },
  preload() {
    if (this.reduced) return;
    this.load(GSAP_URL)
      .then(() => window.gsap?.ticker.lagSmoothing(0)) // run on real time, even if frames drop
      .catch(() => {});
  },
  // Failsafe: content is never left hidden, even if animation frames stall (background tab, busy phone).
  ensureVisible(els, ms = 1600) {
    setTimeout(() => {
      window.gsap?.killTweensOf(els);
      els.forEach((el) => {
        el.style.opacity = "";
        el.style.visibility = "";
        el.style.transform = "";
      });
    }, ms);
  },

  // Page entrance: sections glide up in sequence; numbers count up; rings fill.
  page(root = document.getElementById("app")) {
    const g = window.gsap;
    if (this.reduced || !g || !root) return;
    const els = [...root.children].slice(0, 14);
    g.fromTo(els, { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.55, stagger: 0.05, ease: "power3.out", clearProps: "transform,opacity,visibility" });
    this.ensureVisible(els);
    this.numbers(root);
    this.scrollReveal(root);
  },
  // Below-the-fold cards glide in when they scroll into view (IntersectionObserver + GSAP).
  scrollReveal(root) {
    const g = window.gsap;
    if (this.reduced || !g || !("IntersectionObserver" in window)) return;
    this._io?.disconnect();
    const fold = window.innerHeight;
    const targets = [...root.querySelectorAll(".card, .list > .list-row, .stat, .move, .board-col")].filter((el) => el.getBoundingClientRect().top > fold).slice(0, 80);
    if (!targets.length) return;
    g.set(targets, { autoAlpha: 0, y: 22 });
    const io = (this._io = new IntersectionObserver(
      (entries) => {
        const shown = entries.filter((e) => e.isIntersecting).map((e) => e.target);
        if (!shown.length) return;
        shown.forEach((el) => io.unobserve(el));
        g.to(shown, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.06, ease: "power3.out", clearProps: "transform,opacity,visibility" });
        this.ensureVisible(shown, 1400);
      },
      { rootMargin: "0px 0px -8% 0px" }
    ));
    targets.forEach((el) => io.observe(el));
  },
  reveal(el) {
    const g = window.gsap;
    if (this.reduced || !g || !el) return;
    const els = [...el.children].slice(0, 20);
    g.fromTo(els, { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45, stagger: 0.035, ease: "power2.out", clearProps: "transform,opacity,visibility" });
    this.ensureVisible(els);
  },
  numbers(root) {
    const g = window.gsap;
    if (!g) return;
    root.querySelectorAll(".ring").forEach((r, i) => {
      const p = parseFloat(r.style.getPropertyValue("--p"));
      if (isNaN(p) || p <= 0 || i >= 40) return;
      g.fromTo(r, { "--p": 0 }, { "--p": p, duration: 1.2, delay: 0.1, ease: "power2.out" });
      setTimeout(() => {
        g.killTweensOf(r);
        r.style.setProperty("--p", p);
      }, 1800);
    });
    root.querySelectorAll(".ring > span, .stat-v, .bigscore").forEach((el, i) => i < 40 && this.countUp(el));
  },
  countUp(el) {
    const g = window.gsap;
    const node = [...el.childNodes].find((n) => n.nodeType === 3 && /\d/.test(n.textContent));
    const m = node?.textContent.match(/^(\D*)(\d+)(\D*)$/);
    if (!m) return;
    const [, pre, num, post] = m;
    const o = { v: 0 };
    g.to(o, { v: +num, duration: 1.1, delay: 0.1, ease: "power2.out", onUpdate: () => (node.textContent = pre + Math.round(o.v) + post) });
    setTimeout(() => {
      g.killTweensOf(o);
      node.textContent = pre + num + post;
    }, 1800);
  },

  // Dashboard hero: entrance + a slowly breathing 3D particle wave that tilts toward the cursor.
  async hero(el) {
    if (!el) return;
    const g = window.gsap;
    if (g && !this.reduced) {
      // Headline reveals word by word.
      const h1 = el.querySelector("h1");
      if (h1 && !h1.querySelector(".w")) h1.innerHTML = h1.textContent.split(" ").map((w) => `<span class="w"><span>${esc(w)}</span></span>`).join(" ");
      const words = [...el.querySelectorAll("h1 .w > span")];
      g.from(words, { yPercent: 110, duration: 0.9, stagger: 0.05, ease: "power4.out", clearProps: "transform" });
      this.ensureVisible(words, 1800);
      const parts = [...el.querySelectorAll(".eyebrow, p, .row, .hero-score")];
      g.from(parts, { y: 22, autoAlpha: 0, duration: 0.8, stagger: 0.08, ease: "power3.out", clearProps: "transform,opacity,visibility" });
      this.ensureVisible(parts, 1800);
    }
    if (this.reduced) return;
    try {
      if (!window.THREE) await this.load(THREE_URL);
    } catch {
      return;
    }
    if (!el.isConnected || el.querySelector("canvas.hero-3d")) return;
    this.wave(el);
  },

  wave(el) {
    const THREE = window.THREE;
    const canvas = document.createElement("canvas");
    canvas.className = "hero-3d";
    el.prepend(canvas);
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      canvas.remove();
      return; // no WebGL — the static SVG stays
    }
    el.classList.add("has-3d");
    const mobile = window.innerWidth < 860;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 3.6, 8.5);
    camera.lookAt(0, -0.4, 0);

    const cols = mobile ? 64 : 120;
    const rows = mobile ? 30 : 46;
    const sx = mobile ? 0.3 : 0.24;
    const sz = 0.3;
    const count = cols * rows;
    const pos = new Float32Array(count * 3);
    const base = new Float32Array(count * 2);
    const col = new Float32Array(count * 3);
    const c1 = new THREE.Color("#52525b");
    const c2 = new THREE.Color("#8fb4ff");
    const tmp = new THREE.Color();
    for (let i = 0, k = 0; i < cols; i++)
      for (let j = 0; j < rows; j++, k++) {
        const x = (i - cols / 2) * sx;
        const z = (j - rows / 2) * sz;
        base[k * 2] = x;
        base[k * 2 + 1] = z;
        pos[k * 3] = x;
        pos[k * 3 + 2] = z;
        tmp.copy(c1).lerp(c2, i / cols);
        col[k * 3] = tmp.r;
        col[k * 3 + 1] = tmp.g;
        col[k * 3 + 2] = tmp.b;
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: mobile ? 0.065 : 0.05, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
    const points = new THREE.Points(geo, mat);
    points.position.y = -0.6;
    scene.add(points);

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const target = { x: 0, y: 0 };
    const look = { x: 0, y: 0 };
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      target.x = (e.clientX - r.left) / r.width - 0.5;
      target.y = (e.clientY - r.top) / r.height - 0.5;
    });
    el.addEventListener("pointerleave", () => Object.assign(target, { x: 0, y: 0 }));

    let visible = true;
    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting));
    io.observe(el);

    if (window.gsap) window.gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 1.6, ease: "power2.out" });
    const start = performance.now();
    const tick = (now) => {
      if (!el.isConnected) {
        ro.disconnect();
        io.disconnect();
        geo.dispose();
        mat.dispose();
        renderer.dispose();
        return;
      }
      requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      const t = (now - start) / 1000;
      for (let k = 0; k < count; k++) {
        const x = base[k * 2];
        const z = base[k * 2 + 1];
        pos[k * 3 + 1] = Math.sin(x * 0.55 + t * 0.9) * 0.32 + Math.cos(z * 0.75 + t * 0.6) * 0.22 + Math.sin((x + z) * 0.3 + t * 0.4) * 0.12;
      }
      geo.attributes.position.needsUpdate = true;
      look.x += (target.x - look.x) * 0.04;
      look.y += (target.y - look.y) * 0.04;
      camera.position.x = look.x * 1.6;
      camera.position.y = 3.6 - look.y * 0.8;
      camera.lookAt(0, -0.4, 0);
      points.rotation.y = Math.sin(t * 0.08) * 0.08;
      renderer.render(scene, camera);
    };
    requestAnimationFrame(tick);
  },
};
// Resume Studio score orb: a slowly turning 3D wireframe whose color tracks the ATS score
// (red → amber → green) and pulses whenever the score changes.
Motion.orb = async function (el, getScore) {
  if (!el || this.reduced) return;
  try {
    if (!window.THREE) await this.load(THREE_URL);
  } catch {
    return;
  }
  if (!el.isConnected || el.querySelector("canvas")) return;
  const THREE = window.THREE;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  } catch {
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.z = 5.2;
  const geo = new THREE.IcosahedronGeometry(1.25, 2);
  const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ transparent: true, opacity: 0.35 }));
  const dots = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.05, transparent: true, opacity: 0.9 }));
  const group = new THREE.Group();
  group.add(wire, dots);
  scene.add(group);
  const size = () => {
    const s = el.clientWidth || 160;
    renderer.setSize(s, s, false);
  };
  size();
  const color = new THREE.Color();
  const target = new THREE.Color();
  const tone = (v) => (v >= 80 ? "#22c55e" : v >= 60 ? "#3b82f6" : v >= 40 ? "#f59e0b" : "#ef4444");
  let last = getScore();
  color.set(tone(last));
  let pulse = 0;
  const t0 = performance.now();
  const tick = (now) => {
    if (!el.isConnected) {
      geo.dispose();
      wire.geometry.dispose();
      renderer.dispose();
      return;
    }
    requestAnimationFrame(tick);
    if (document.hidden) return;
    const v = getScore();
    if (v !== last) {
      pulse = 1;
      last = v;
    }
    target.set(tone(v));
    color.lerp(target, 0.06);
    wire.material.color.copy(color);
    dots.material.color.copy(color);
    const t = (now - t0) / 1000;
    pulse *= 0.93;
    const s = 1 + pulse * 0.18 + Math.sin(t * 1.4) * 0.02;
    group.scale.set(s, s, s);
    group.rotation.y = t * 0.25;
    group.rotation.x = Math.sin(t * 0.3) * 0.3;
    renderer.render(scene, camera);
  };
  requestAnimationFrame(tick);
};
Motion.preload();
