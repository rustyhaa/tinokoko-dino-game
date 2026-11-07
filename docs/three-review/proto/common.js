import * as THREE from './node_modules/three/build/three.module.js';
export { THREE };
export function setup(bgTop, bgBottom) {
  const W = innerWidth, H = innerHeight;
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.setSize(W, H);
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  document.body.appendChild(r.domElement);
  const scene = new THREE.Scene();
  const c = document.createElement('canvas'); c.width = 2; c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, bgTop); gr.addColorStop(1, bgBottom); g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  const bt = new THREE.CanvasTexture(c); bt.colorSpace = THREE.SRGBColorSpace; scene.background = bt;
  const cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbfd4e6, 1.4));
  const sun = new THREE.DirectionalLight(0xfff3e0, 2.2); sun.position.set(4, 8, 6); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 }); sun.shadow.radius = 6; scene.add(sun);
  return { r, scene, cam };
}
const loader = new THREE.TextureLoader();
export function sprite(url, h, opt = {}) {   // 손그림 PNG/WebP 를 세워 둔 판 (그림자 드리움)
  return new Promise(res => loader.load(url, t => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const w = h * t.image.width / t.image.height;
    const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 }));
    m.castShadow = true; m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: 0.4 });
    if (opt.flip) m.scale.x = -1;
    res(m);
  }));
}
export function label(text, h, opt = {}) {   // 둥근 이름표 (한글 글자)
  const c = document.createElement('canvas'), n = [...text].length; c.width = 160 * n + 120; c.height = 220; const g = c.getContext('2d');
  g.fillStyle = opt.bg || 'rgba(255,255,255,.95)'; const r = 100; g.beginPath(); g.roundRect(6, 6, c.width - 12, c.height - 12, r); g.fill();
  g.lineWidth = 10; g.strokeStyle = opt.border || '#f0c879'; g.stroke();
  g.font = '800 150px "Noto Sans KR","Apple SD Gothic Neo",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  [...text].forEach((ch, i) => { g.fillStyle = opt.hi === i ? '#ff6b3d' : (opt.color || '#2b3550'); g.fillText(ch, 60 + 160 * i + 80, 118); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(h * c.width / c.height, h), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
  return m;
}
export function round(w, h, d, r, color, opt = {}) {   // 모서리 둥근 상자
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: r * 0.6, bevelSize: r * 0.6, bevelSegments: 6, curveSegments: 10 }); geo.translate(0, 0, -d / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: opt.rough ?? 0.45, metalness: 0, ...opt.mat }));
  m.castShadow = true; m.receiveShadow = true; return m;
}
export const done = () => { window.__ready = true; };
