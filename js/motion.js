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
      const parts = [...el.querySelectorAll(".eyebrow, h1, p, .row, .hero-score")];
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
    const c1 = new THREE.Color("#93c5fd");
    const c2 = new THREE.Color("#e9d5ff");
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
Motion.preload();
