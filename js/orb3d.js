// A living 3D orb for practice characters (three.js): a noise-deformed sphere with a soft glow.
// States: idle (breathing), speaking (ripples on each word), listening (reacts as you talk), thinking (swirls).
// Falls back to a CSS orb when WebGL or three.js isn't available. One orb renders at a time.

const Orb3D = (() => {
  const NOISE = `
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }`;
  const VERT = `
  uniform float uTime; uniform float uAmp; uniform float uFreq;
  varying vec3 vN; varying float vNoise; varying vec3 vP;
  ${NOISE}
  void main(){
    float n = snoise(normal*uFreq + vec3(uTime*0.32, uTime*0.21, uTime*0.27));
    float n2 = snoise(normal*uFreq*2.3 - vec3(uTime*0.45));
    float d = (n*0.85 + n2*0.15) * uAmp;
    vec3 p = position + normal*d;
    vNoise = n; vP = p; vN = normalize(normalMatrix*normal);
    gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0);
  }`;
  const FRAG = `
  uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform float uTime; uniform float uGlow;
  varying vec3 vN; varying float vNoise; varying vec3 vP;
  void main(){
    float rim = pow(1.0 - abs(dot(vN, vec3(0.0,0.0,1.0))), 2.2);
    float t = 0.5 + 0.5*sin(vP.y*2.2 + vP.x*1.3 + uTime*0.55 + vNoise*2.4);
    vec3 c = mix(uC1, uC2, t);
    c = mix(c, uC3, smoothstep(0.15, 0.95, vNoise*0.5+0.5)*0.55);
    c += rim * (0.35 + uGlow*0.4);
    gl_FragColor = vec4(c, 1.0);
  }`;
  const STATES = {
    idle: { amp: 0.1, freq: 1.2, speed: 0.55, glow: 0.1 },
    speaking: { amp: 0.15, freq: 1.45, speed: 0.95, glow: 0.35 },
    listening: { amp: 0.13, freq: 1.7, speed: 0.8, glow: 0.25 },
    thinking: { amp: 0.09, freq: 2.2, speed: 2, glow: 0.15 },
  };
  let current = null;

  function cssFallback(el, colors) {
    el.innerHTML = `<div class="orb-css" style="--c1:${colors[0]};--c2:${colors[1]};--c3:${colors[2]}"></div>`;
    const node = el.firstChild;
    return {
      setState(s) {
        node.dataset.state = s;
      },
      pulse() {
        node.animate?.([{ transform: "scale(1.06)" }, { transform: "scale(1)" }], { duration: 260, easing: "ease-out" });
      },
      setColors(c) {
        node.style.setProperty("--c1", c[0]);
        node.style.setProperty("--c2", c[1]);
        node.style.setProperty("--c3", c[2]);
      },
      destroy() {
        el.innerHTML = "";
      },
    };
  }

  async function mount(el, { colors = ["#6d5dfc", "#22d3ee", "#a78bfa"], state = "idle" } = {}) {
    current?.destroy();
    let THREE = window.THREE;
    if (!THREE && !Motion.reduced) {
      try {
        await Motion.load(THREE_URL);
        THREE = window.THREE;
      } catch {}
    }
    if (!el.isConnected) return null;
    if (!THREE || Motion.reduced) return (current = cssFallback(el, colors));
    const canvas = document.createElement("canvas");
    canvas.className = "orb-canvas";
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      return (current = cssFallback(el, colors));
    }
    el.innerHTML = "";
    el.appendChild(canvas);
    const mobile = window.innerWidth < 860;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.z = 4.2;
    const uniforms = {
      uTime: { value: 0 },
      uAmp: { value: STATES[state].amp },
      uFreq: { value: STATES[state].freq },
      uGlow: { value: STATES[state].glow },
      uC1: { value: new THREE.Color(colors[0]) },
      uC2: { value: new THREE.Color(colors[1]) },
      uC3: { value: new THREE.Color(colors[2]) },
    };
    const geo = new THREE.IcosahedronGeometry(1, mobile ? 30 : 48);
    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    const live = { ...STATES[state], kick: 0 };
    const resize = () => {
      const s = el.clientWidth || 200;
      renderer.setSize(s, s, false);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    let visible = true;
    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting));
    io.observe(el);
    let t = 0;
    let last = performance.now();
    let raf = 0;
    let dead = false;
    const tick = (now) => {
      if (dead) return;
      if (!el.isConnected) return api.destroy();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (visible && !document.hidden) {
        t += dt * live.speed;
        live.kick *= Math.pow(0.02, dt); // ripples fade out quickly
        uniforms.uTime.value = t;
        uniforms.uAmp.value = live.amp + live.kick * 0.07;
        uniforms.uFreq.value = live.freq;
        uniforms.uGlow.value = live.glow + live.kick * 0.5;
        mesh.rotation.y += dt * 0.25 * live.speed;
        mesh.rotation.x = Math.sin(t * 0.3) * 0.15;
        const s = 1 + live.kick * 0.045;
        mesh.scale.set(s, s, s);
        renderer.render(scene, camera);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    if (window.gsap && !Motion.reduced) window.gsap.fromTo(canvas, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 1.1, ease: "expo.out", clearProps: "transform" });
    const api = {
      setState(s) {
        const target = STATES[s] || STATES.idle;
        el.dataset.state = s;
        if (window.gsap && !Motion.reduced) window.gsap.to(live, { ...target, duration: 0.8, ease: "power2.out", overwrite: "auto" });
        else Object.assign(live, target);
      },
      pulse(v = 1) {
        live.kick = Math.min(1, live.kick + v * 0.35);
      },
      setColors(c) {
        const to = c.map((x) => new THREE.Color(x));
        if (window.gsap && !Motion.reduced) ["uC1", "uC2", "uC3"].forEach((k, i) => window.gsap.to(uniforms[k].value, { r: to[i].r, g: to[i].g, b: to[i].b, duration: 0.7, ease: "power2.inOut" }));
        else ["uC1", "uC2", "uC3"].forEach((k, i) => uniforms[k].value.copy(to[i]));
      },
      destroy() {
        if (dead) return;
        dead = true;
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        geo.dispose();
        mat.dispose();
        renderer.dispose();
        renderer.forceContextLoss?.();
        if (current === api) current = null;
      },
    };
    api.setState(state);
    return (current = api);
  }
  return { mount, get current() { return current; } };
})();
