// 티노코코 글자 정원 3D — 떠 있는 정원 섬에서 톡(또는 문지르기) 하나로 키우는 놀이 (three.js)
//  흙더미를 톡 하면 비구름이 날아와 비를 뿌리고 쑥쑥: 새싹 → 잎 → 꽃봉오리 → 꽃·열매.
//  다 자라면 나무 팻말이 솟아 "튤립." 하고 읽어 준다. 넷 다 자라면 잔치 → 다음 씨앗.
//  실패·점수 없음. 아무 데나 톡 해도 반짝일 뿐. 기기가 느리면 화면 효과를 스스로 줄인다.
//  2D 판(../garden/)과 같은 놀이 규칙. 3D 를 못 쓰는 기기는 index.html 이 2D 판으로 보낸다.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

const HG = window.H, TK = window.TK;
const SHARED = new URL('../shared/', import.meta.url).href;
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const noise = (x, z) => Math.sin(x * 2.1 + Math.sin(z * 1.7)) * 0.5 + Math.sin(z * 2.9 + x * 0.6) * 0.3 + Math.sin((x + z) * 5.3) * 0.12;
const NAME = { tulip: '튤립', carrot: '당근', egg: '공룡', sunflower: '해바라기', strawberry: '딸기', tomato: '토마토' };
const SETS = [['tulip', 'carrot', 'egg', 'strawberry'], ['tomato', 'egg', 'tulip', 'carrot'], ['sunflower', 'strawberry', 'egg', 'tomato']];

// ---------- 화면·조명 ----------
const r = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
let quality = 2;   // 2: 빛 번짐+계단 제거, 1: 계단 제거만, 0: 효과 없음 (느리면 내려감)
const dprMax = () => Math.min(window.devicePixelRatio || 1, quality >= 2 ? 1.75 : 1.25);
r.setPixelRatio(dprMax()); r.setSize(innerWidth, innerHeight);
r.shadowMap.enabled = true; r.shadowMap.type = THREE.VSMShadowMap;
r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(r.domElement);
const scene = new THREE.Scene();
const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.45;
{ const c = document.createElement('canvas'); c.width = 4; c.height = 512; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#7cc7f5'); gr.addColorStop(0.55, '#bfe6fb'); gr.addColorStop(1, '#fff2d9'); g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t; }
const cam = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 200);
scene.add(new THREE.HemisphereLight(0xcfeaff, 0x8a6a3a, 0.55));
const sun = new THREE.DirectionalLight(0xfff0d6, 3.1); sun.position.set(-7, 11, 7); sun.castShadow = true;
sun.shadow.mapSize.set(1536, 1536); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 }); sun.shadow.radius = 8; sun.shadow.blurSamples = 12; sun.shadow.bias = -0.0005; scene.add(sun);
const rim = new THREE.DirectionalLight(0xbfe0ff, 1.2); rim.position.set(6, 6, -9); scene.add(rim);
const mat = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.6, ...o });
const add = (m, parent = scene, cast = true, recv = true) => { m.traverse(o => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = recv; } }); parent.add(m); return m; };

// ---------- 떠 있는 정원 섬 ----------
const R = 7.2, world = new THREE.Group(); scene.add(world);
add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.5, 96), mat(0x7fc35a, { roughness: 0.9 })), world).position.y = -0.25;
add(new THREE.Mesh(new THREE.CylinderGeometry(R * 0.995, R * 0.86, 2.2, 96, 4), mat(0x8a5a33, { roughness: 1 })), world).position.y = -1.6;
add(new THREE.Mesh(new THREE.CylinderGeometry(R * 0.97, R * 0.95, 0.25, 96), mat(0x5e3b20, { roughness: 1 })), world).position.y = -1.1;
for (let i = 0; i < 34; i++) { const a = rnd() * 6.28, y = -0.8 - rnd() * 1.8, rr = THREE.MathUtils.lerp(R * 0.995, R * 0.86, (-0.5 - y) / 2.2) * 0.985; const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + rnd() * 0.18, 0), mat(0xb3a08a, { roughness: 0.8 })); st.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr); st.rotation.set(rnd() * 3, rnd() * 3, 0); add(st, world); }
const rimT = new THREE.Mesh(new THREE.TorusGeometry(R, 0.22, 16, 120), mat(0x74b94f, { roughness: 0.95 })); rimT.rotation.x = Math.PI / 2; add(rimT, world);

// 잔디 (바람에 살랑 — 꼭짓점 셰이더에 바람만 더함)
const wind = { value: 0 };
{
  const blade = new THREE.PlaneGeometry(0.06, 0.32, 1, 3); blade.translate(0, 0.16, 0);
  const bp = blade.attributes.position; for (let i = 0; i < bp.count; i++) { const y = bp.getY(i); bp.setX(i, bp.getX(i) * (1 - y / 0.36)); bp.setZ(i, y * y * 0.6); }
  const gm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide });
  gm.onBeforeCompile = sh => { sh.uniforms.uWind = wind; sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat h = position.y / 0.32; vec4 wp = instanceMatrix * vec4(0.,0.,0.,1.); transformed.x += sin(uWind * 1.7 + wp.x * 0.8 + wp.z * 0.6) * 0.07 * h * h; transformed.z += cos(uWind * 1.3 + wp.z * 0.9) * 0.04 * h * h;'); };
  const n = 7000, inst = new THREE.InstancedMesh(blade, gm, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const a = rnd() * 6.28, rr = Math.sqrt(rnd()) * (R - 0.3), x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (Math.abs(z - 0.2) < 1.15 && Math.abs(x) < 5.8) { i--; continue; }
    e.set(0, rnd() * 6.28, (rnd() - 0.5) * 0.5); q.setFromEuler(e); const s = 0.7 + rnd() * 0.9;
    m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * (0.8 + rnd() * 0.6), s)); inst.setMatrixAt(i, m4);
    col.setHSL(0.27 + rnd() * 0.05, 0.55 + rnd() * 0.2, 0.36 + rnd() * 0.16); inst.setColorAt(i, col);
  }
  inst.receiveShadow = true; world.add(inst);
}
const beds = [0, 1].map(() => add(new THREE.Mesh(new RoundedBoxGeometry(12.2, 0.22, 2.4, 6, 0.1), mat(0x6b4426, { roughness: 1 })), world));   // 밭 고랑: 가로는 한 줄, 세로는 두 줄
// 울타리 + 밧줄, 나무, 버섯, 작은 꽃
for (let i = 0; i < 26; i++) { const a = Math.PI * (1.08 + i / 25 * 0.84), x = Math.cos(a) * (R - 0.55), z = Math.sin(a) * (R - 0.55); const p = new THREE.Mesh(new RoundedBoxGeometry(0.28, 1.0 + (i % 2) * 0.12, 0.16, 3, 0.07), mat(0xf4e6c8, { roughness: 0.7 })); p.position.set(x, 0.5, z); p.lookAt(0, 0.5, 0); add(p, world); }
{ const pts = []; for (let i = 0; i <= 60; i++) { const a = Math.PI * (1.08 + i / 60 * 0.84); pts.push(new THREE.Vector3(Math.cos(a) * (R - 0.55), 0.78 + Math.sin(i * 0.52) * 0.04, Math.sin(a) * (R - 0.55))); } add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.035, 8), mat(0xd9b98a, { roughness: 0.9 })), world); }
const tree = (x, z, s, c) => { const g = new THREE.Group(); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 1.4 * s, 12), mat(0x8d5a32, { roughness: 0.9 })); tr.position.y = 0.7 * s; g.add(tr); [[0, 1.8, 0, 0.85], [0.45, 1.55, 0.2, 0.6], [-0.45, 1.6, -0.1, 0.62], [0.1, 2.3, -0.1, 0.55]].forEach(([a, b, d, e2]) => { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(e2 * s, 3), mat(c, { roughness: 0.75, sheen: 0.5, sheenColor: new THREE.Color(0xd8ffb0) })); f.position.set(a * s, b * s, d * s); g.add(f); }); g.position.set(x, 0, z); return add(g, world); };
tree(-5.2, -3.6, 1.15, 0x5cb85a); tree(5.6, -3.2, 1.0, 0x6cc464); tree(-6.2, -1.2, 0.8, 0x7bd06a);
const mush = (x, z, s) => { const g = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.13 * s, 0.32 * s, 16), mat(0xfff4e0)); st.position.y = 0.16 * s; g.add(st); const cap = new THREE.Mesh(new THREE.SphereGeometry(0.26 * s, 24, 12, 0, 6.29, 0, 1.6), mat(0xff4d3d, { roughness: 0.35, clearcoat: 0.6 })); cap.position.y = 0.3 * s; cap.scale.y = 0.75; g.add(cap); for (let k = 0; k < 5; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.04 * s, 8, 6), mat(0xffffff)); d.position.set(Math.cos(k * 1.25) * 0.16 * s, 0.42 * s, Math.sin(k * 1.25) * 0.16 * s); g.add(d); } g.position.set(x, 0, z); return add(g, world); };
mush(-5.6, 2.6, 1.3); mush(-5.1, 3.1, 0.9); mush(5.3, -1.8, 1.1);
{ const fcols = [0xff6fa8, 0xffd54a, 0x8fb8ff, 0xffffff, 0xff9a5a], petal = new THREE.SphereGeometry(0.07, 8, 6);
  for (let k = 0; k < 50; k++) { const a = rnd() * 6.28, rr = 2.2 + rnd() * (R - 2.8), x = Math.cos(a) * rr, z = Math.sin(a) * rr; if (Math.abs(z - 0.2) < 1.5 && Math.abs(x) < 6.2) continue; const g = new THREE.Group(); const m = mat(fcols[k % 5], { roughness: 0.5 }); for (let p = 0; p < 5; p++) { const pe = new THREE.Mesh(petal, m); pe.position.set(Math.cos(p * 1.26) * 0.08, 0, Math.sin(p * 1.26) * 0.08); pe.scale.y = 0.4; g.add(pe); } g.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat(0xffc93a))); g.position.set(x, 0.2 + rnd() * 0.12, z); add(g, world, false, true); } }

// ---------- 잎·식물 부품 ----------
const leafGeo = (len = 1, wid = 0.35, bend = 0.4) => {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(wid, len * 0.45, 0, len); s.quadraticCurveTo(-wid, len * 0.45, 0, 0);
  const g = new THREE.ShapeGeometry(s, 10), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), x = p.getX(i); p.setZ(i, (y / len) ** 2 * bend * len - Math.abs(x) * 0.25); }
  g.computeVertexNormals(); return g;
};
const leafMat = mat(0x4fae46, { roughness: 0.55, side: THREE.DoubleSide, sheen: 0.4, sheenColor: new THREE.Color(0xc8f5a0) });
const leaf = (parent, pos, ry, rx, len, wid, bend) => { const m = new THREE.Mesh(leafGeo(len, wid, bend), leafMat); m.position.copy(pos); m.rotation.set(rx, ry, 0, 'YXZ'); return add(m, parent); };
const stem = (parent, h, color = 0x3f9a3a) => { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.08, h * 0.5, 0), new THREE.Vector3(-0.02, h, 0.05)]); return add(new THREE.Mesh(new THREE.TubeGeometry(c, 16, 0.055, 8), mat(color, { roughness: 0.5 })), parent); };
// 단계별 모양: sprout(새싹) / leaves(잎) / bud(꽃봉오리) / full(다 자람). 각 단계는 Group, 보이는 단계만 켬
function buildPlant(kind) {
  const st = { sprout: new THREE.Group(), leaves: new THREE.Group(), bud: new THREE.Group(), full: new THREE.Group() };
  const sp = st.sprout; leaf(sp, new THREE.Vector3(0, 0, 0), 0.3, -0.5, 0.45, 0.22, 0.6); leaf(sp, new THREE.Vector3(0, 0, 0), 0.3 + Math.PI, -0.5, 0.45, 0.22, 0.6);
  const lv = st.leaves; stem(lv, 0.7); leaf(lv, new THREE.Vector3(0, 0.05, 0), 0.9, -0.4, 0.9, 0.28, 0.5); leaf(lv, new THREE.Vector3(0, 0.1, 0), -2.1, -0.45, 0.8, 0.26, 0.55);
  const bd = st.bud, fl = st.full;
  if (kind === 'egg') {   // 공룡알: 흙 속에서 점점 올라와 톡 깨짐
    st.sprout = new THREE.Group(); st.leaves = new THREE.Group();
    const egg = (g, h, lift) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.62, 40, 28), mat(0xf7f0de, { roughness: 0.45, clearcoat: 0.4 })); e.scale.set(1, 1.32, 1); e.position.y = lift; add(e, g); for (let k = 0; k < 12; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), mat(0x72c26a, { roughness: 0.5 })); const a = k * 2.4, b = (k % 5) / 5 * 1.3 - 0.5; s.position.set(Math.cos(a) * 0.6 * Math.cos(b), lift + Math.sin(b) * 0.8, Math.sin(a) * 0.6 * Math.cos(b)); s.scale.set(1, 1, 0.4); s.lookAt(0, lift, 0); add(s, g); } g.scale.setScalar(h); };
    egg(st.sprout, 0.45, 0.0); egg(st.leaves, 0.7, 0.2); egg(bd, 0.9, 0.45);
    for (let k = 0; k < 4; k++) { const sh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10, 0, 1.2, 0, 1.0), mat(0xf7f0de, { roughness: 0.45, side: THREE.DoubleSide })); sh.position.set((k - 1.5) * 0.45, 0.12, 0.7 + (k % 2) * 0.2); sh.rotation.set(k * 0.7, k * 1.3, k * 0.4); add(sh, fl); }
    const half = new THREE.Mesh(new THREE.SphereGeometry(0.62, 40, 20, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), mat(0xf7f0de, { roughness: 0.45, side: THREE.DoubleSide })); half.scale.set(1, 1.32, 1); half.position.y = 0.55; add(half, fl);
  } else if (kind === 'tulip' || kind === 'sunflower') {
    stem(bd, 1.5); leaf(bd, new THREE.Vector3(0, 0.05, 0), 0.9, -0.35, 1.1, 0.3, 0.5); leaf(bd, new THREE.Vector3(0, 0.1, 0), -2.0, -0.4, 1.0, 0.28, 0.55);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), mat(kind === 'tulip' ? 0x7fcf6a : 0x6fbf55, { roughness: 0.5 })); b.scale.y = 1.4; b.position.set(-0.02, 1.6, 0.05); add(b, bd);
    stem(fl, 1.9); leaf(fl, new THREE.Vector3(0, 0.05, 0), 0.9, -0.35, 1.25, 0.32, 0.5); leaf(fl, new THREE.Vector3(0, 0.1, 0), -2.0, -0.4, 1.1, 0.3, 0.55);
    if (kind === 'tulip') {
      const pg = new THREE.SphereGeometry(0.42, 24, 18, 0, Math.PI * 0.62, 0, Math.PI * 0.62); pg.rotateX(Math.PI); pg.translate(0, 0.42, 0);
      const pmt = mat(0xff4f78, { roughness: 0.4, sheen: 0.8, sheenColor: new THREE.Color(0xffc0d0), clearcoat: 0.3, side: THREE.DoubleSide });
      for (let k = 0; k < 6; k++) { const p = new THREE.Mesh(pg, pmt); p.position.set(-0.02, 1.85, 0.05); p.rotation.y = k * Math.PI / 3; p.scale.set(1, 1.25, 1); add(p, fl); }
    } else {
      const head = new THREE.Group(); head.position.set(-0.02, 2.05, 0.1); head.rotation.x = -0.5;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 32), mat(0x6b3f1d, { roughness: 0.9 })), head).rotation.x = Math.PI / 2;
      const pg = new THREE.SphereGeometry(0.2, 12, 8); for (let k = 0; k < 14; k++) { const p = new THREE.Mesh(pg, mat(0xffc92e, { roughness: 0.45, sheen: 0.5 })); const a = k / 14 * 6.28; p.position.set(Math.cos(a) * 0.5, Math.sin(a) * 0.5, -0.02); p.scale.set(0.6, 1.4, 0.25); p.rotation.z = a - Math.PI / 2; add(p, head); }
      fl.add(head);
    }
  } else if (kind === 'carrot') {
    for (let k = 0; k < 5; k++) leaf(bd, new THREE.Vector3(0, 0, 0), k * 1.25, -0.3 - (k % 2) * 0.2, 0.8, 0.12, 0.7);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.2, 24), mat(0xff8424, { roughness: 0.55 })); top.position.y = 0.05; add(top, bd);
    const pts = []; for (let i = 0; i <= 18; i++) { const t = i / 18; pts.push(new THREE.Vector2(0.34 * Math.sin(Math.PI * 0.5 * (1 - t)) ** 0.7 * (1 - t * 0.15) + 0.001, -t * 1.5)); }
    const g = new THREE.LatheGeometry(pts, 32), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); const k = 1 + Math.sin(y * 22) * 0.03; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } g.computeVertexNormals();
    const c = new THREE.Mesh(g, mat(0xff8424, { roughness: 0.55, clearcoat: 0.25, side: THREE.DoubleSide })); c.position.y = 1.2; c.rotation.z = 0.12; add(c, fl);
    for (let k = 0; k < 7; k++) leaf(fl, new THREE.Vector3(-0.02, 1.18, 0), k * 0.9, -0.25 - (k % 2) * 0.25, 0.9 + (k % 3) * 0.15, 0.13, 0.7);
  } else {   // strawberry / tomato: 덤불 + 열매
    const bush = g => { for (let k = 0; k < 7; k++) leaf(g, new THREE.Vector3(0, 0, 0), k * 0.9, -0.6 - (k % 2) * 0.2, 0.75, 0.3, 0.45); };
    bush(bd); bush(fl);
    const fruit = (g, ripe) => { for (let k = 0; k < (kind === 'tomato' ? 4 : 6); k++) { const a = k * 1.1 + 0.4, rr = 0.35 + (k % 2) * 0.15; const f = new THREE.Mesh(kind === 'tomato' ? new THREE.SphereGeometry(0.2, 20, 14) : new THREE.ConeGeometry(0.13, 0.26, 16), mat(ripe ? (kind === 'tomato' ? 0xf0402e : 0xf03a4a) : 0xbfe08a, { roughness: 0.35, clearcoat: 0.8 })); f.position.set(Math.cos(a) * rr, kind === 'tomato' ? 0.45 + (k % 2) * 0.2 : 0.28, Math.sin(a) * rr); if (kind !== 'tomato') f.rotation.x = Math.PI; add(f, g); } };
    fruit(bd, false); fruit(fl, true);
  }
  const g = new THREE.Group(); Object.values(st).forEach(s => { s.visible = false; g.add(s); });
  return { g, st };
}

// 흙더미 (톡 대상) + 젖은 색
const moundGeo = (() => { const g = new THREE.SphereGeometry(1.0, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const k = 1 + noise(v.x * 3, v.z * 3) * 0.07; p.setXYZ(i, v.x * k, v.y * k, v.z * k); } g.computeVertexNormals(); return g; })();
const dry = new THREE.Color(0x7a4f2e), wetC = new THREE.Color(0x4e301a);
// 나무 팻말 (글자는 캔버스, 읽을 때 글자마다 강조)
function makeSign(text) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.9, 0.12, 3, 0.04), mat(0xa06a3c, { roughness: 0.8 })); post.position.y = 0.45; g.add(post);
  const n = [...text].length, bw = 0.55 * n + 0.45;
  const board = new THREE.Mesh(new RoundedBoxGeometry(bw, 0.62, 0.1, 4, 0.08), mat(0xe9c48e, { roughness: 0.7 })); board.position.y = 0.9; g.add(board);
  const c = document.createElement('canvas'); c.width = 160 * n + 80; c.height = 180; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(bw * 0.92, bw * 0.92 * c.height / c.width), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.8 })); lab.position.set(0, 0.9, 0.056); g.add(lab);
  let last = null;
  const paint = hi => { if (hi === last) return; last = hi; const q = c.getContext('2d'); q.clearRect(0, 0, c.width, c.height); q.font = '800 130px "Apple SD Gothic Neo","Noto Sans KR",sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; [...text].forEach((ch, i) => { q.fillStyle = hi === 'all' || hi === i ? '#e8552b' : '#4a2f1a'; q.fillText(ch, 40 + 160 * i + 80, 98); }); t.needsUpdate = true; };
  paint(-1); g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { g, paint };
}

// ---------- 밭 4칸 ----------
let plots = [], setIdx = 0, phase = 'play', phaseT = 0, rounds = 0;
const port = () => innerWidth < innerHeight;
const plotPos = i => port() ? new THREE.Vector3(i % 2 ? 1.65 : -1.65, 0, i < 2 ? -1.5 : 1.9) : new THREE.Vector3(-4.5 + i * 3.0, 0, 0.2);   // 세로는 2×2
const kindFor = k => (k === 'egg' && !HG.likes('공룡') ? 'tomato' : k);
function newSet() {
  plots.forEach(p => world.remove(p.root));
  plots = SETS[setIdx % SETS.length].map((k0, i) => {
    const kind = kindFor(k0), root = new THREE.Group(); root.position.copy(plotPos(i));
    const m = new THREE.Mesh(moundGeo, mat(0x7a4f2e, { roughness: 1, clearcoat: 0, clearcoatRoughness: 0.3 })); m.scale.set(1.05, 0.42, 0.9); m.position.y = 0.08; add(m, root);
    const { g, st } = buildPlant(kind); g.position.y = 0.4; root.add(g);
    const sign = makeSign(NAME[kind]); sign.g.position.set(0, 0, 1.75); sign.g.scale.setScalar(0.001); root.add(sign.g);
    world.add(root);
    return { kind, root, mound: m, plant: g, st, sign, grow: 0, stage: 0, wet: 0, pop: 0, wig: 0, signK: 0 };
  });
}
const STAGES = ['none', 'sprout', 'leaves', 'bud', 'full'];
function setStage(p) { Object.entries(p.st).forEach(([k, s]) => { s.visible = STAGES[p.stage] === k; }); }

// ---------- 비구름 ----------
const cloud = new THREE.Group();
[[0, 0, 0, 0.7], [0.7, -0.12, 0.1, 0.55], [-0.7, -0.12, 0, 0.55], [0.3, 0.32, -0.1, 0.5], [-0.3, 0.28, 0.15, 0.48], [1.15, -0.25, 0, 0.38], [-1.15, -0.25, 0, 0.38]].forEach(([x, y, z, s]) => { const c = new THREE.Mesh(new THREE.SphereGeometry(s, 28, 20), mat(0xffffff, { roughness: 0.75, sheen: 1, sheenColor: new THREE.Color(0xdff0ff) })); c.position.set(x, y, z); cloud.add(c); });
cloud.position.set(-5.5, 4.2, -1.5); add(cloud, world, true, false);
const cloudFace = new THREE.Group(); [-0.25, 0.25].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), mat(0x333344)); e.position.set(x, 0.05, 0.66); cloudFace.add(e); }); cloud.add(cloudFace);
const drops = [], dropGeo = new THREE.CapsuleGeometry(0.035, 0.22, 4, 8), dropMat = new THREE.MeshPhysicalMaterial({ color: 0x8fd3ff, roughness: 0.05, transparent: true, opacity: 0.85 });
for (let k = 0; k < 30; k++) { const d = new THREE.Mesh(dropGeo, dropMat); d.visible = false; world.add(d); drops.push({ m: d, life: 0 }); }
const cloudHome = () => port() ? new THREE.Vector3(-3.0, 4.8, -4.2) : new THREE.Vector3(-5.5, 4.2, -1.5);
let cloudTo = new THREE.Vector3(-5.5, 4.2, -1.5), raining = 0, rainPlot = null;

// ---------- 반짝이·꽃가루 입자 ----------
const sparks = [], sparkGeo = new THREE.OctahedronGeometry(0.07);
function spark(pos, color = 0xfff3a0, n = 10) { for (let k = 0; k < n; k++) { const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.5), transparent: true })); m.position.copy(pos); world.add(m); sparks.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3 + 1, (Math.random() - 0.5) * 3), life: 1 }); } }

// ---------- 손그림 친구들 (카메라를 향해 서 있는 판) ----------
const loader = new THREE.TextureLoader();
const sprite = (u, h) => { const g = new THREE.Group(); loader.load(u, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; const w = h * t.image.width / t.image.height; const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0); const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.5, roughness: 1, side: THREE.DoubleSide })); m.castShadow = true; m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: 0.5 }); g.add(m); }); world.add(g); return g; };
const twins = [{ kind: 'tino', g: sprite(SHARED + 'assets/tino_jump_v2.png', 2.4), hop: -1 }, { kind: 'coco', g: sprite(SHARED + 'assets/coco_laugh_v2.png', 2.4), hop: -1 }];
const butterfly = sprite(SHARED + 'pics/' + encodeURIComponent('나비') + '.webp', 0.7);
const babyDino = sprite(SHARED + 'pics/' + encodeURIComponent('공룡') + '.webp', 1.1); babyDino.visible = false;
// 바구니 + 수확한 열매
const basket = new THREE.Group();
{ const b = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.55, 0.62, 28, 3, true), mat(0xc8925a, { roughness: 0.85, side: THREE.DoubleSide })); b.position.y = 0.31; basket.add(b);
  for (let k = 0; k < 4; k++) { const band = new THREE.Mesh(new THREE.TorusGeometry(0.56 + k * 0.06, 0.03, 6, 40), mat(0xa8743f)); band.rotation.x = Math.PI / 2; band.position.y = 0.06 + k * 0.17; basket.add(band); }
  const h2 = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.04, 6, 40, Math.PI), mat(0xa8743f)); h2.position.y = 0.6; basket.add(h2); }
basket.position.set(0, 0, 3.9); add(basket, world);
const harvested = new THREE.Group(); basket.add(harvested);

// ---------- 카메라: 가로는 비스듬히, 세로는 더 멀리·높이 ----------
function layout() {
  const W = innerWidth, H = innerHeight, asp = W / H; cam.aspect = asp;
  if (asp >= 1) { cam.fov = 32; cam.position.set(0, 6.6, 13.6); cam.lookAt(0, 0.9, 0.6); }
  else { cam.fov = 50; const d = 3.6 / Math.tan(Math.atan(Math.tan(THREE.MathUtils.degToRad(25)) * asp)); cam.position.set(0, d * 0.82, d * 0.57 + 1.4); cam.lookAt(0, 0.4, 1.2); }   // 밭 2×2(폭 약 7)가 화면 폭에 맞게
  plots.forEach((p, i) => p.root.position.copy(plotPos(i)));
  if (asp >= 1) { beds[0].scale.set(1, 1, 1); beds[0].position.set(0, 0.02, 0.2); beds[1].visible = false; }
  else { beds.forEach((b, i) => { b.visible = true; b.scale.set(0.5, 1, 1); b.position.set(0, 0.02, i ? 1.9 : -1.5); }); }
  basket.position.set(0, 0, asp >= 1 ? 3.9 : 4.7);
  cam.updateProjectionMatrix(); r.setPixelRatio(dprMax()); r.setSize(W, H); if (comp) { comp.setPixelRatio(dprMax()); comp.setSize(W, H); }
  twins[0].g.position.set(asp >= 1 ? -2.3 : -2.1, 0, asp >= 1 ? 4.5 : 5.3); twins[1].g.position.set(asp >= 1 ? 2.3 : 2.1, 0, asp >= 1 ? 4.5 : 5.3);   // 바구니 양옆 (팻말을 안 가리게)
}
// ---------- 후처리 ----------
let comp = null, bloom = null, smaa = null;
function buildComposer() {
  comp = new EffectComposer(r); comp.setPixelRatio(dprMax()); comp.setSize(innerWidth, innerHeight);
  comp.addPass(new RenderPass(scene, cam));
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.25, 0.4, 1.15); bloom.enabled = quality >= 2; comp.addPass(bloom);
  comp.addPass(new OutputPass());
  comp.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 v; void main(){ vec4 c = texture2D(tDiffuse, v); float l = dot(c.rgb, vec3(.299,.587,.114)); c.rgb = mix(vec3(l), c.rgb, 1.1); float d = distance(v, vec2(.5)); c.rgb *= mix(1.0, .85, smoothstep(.5, .9, d)); gl_FragColor = c; }' }));
  smaa = new SMAAPass(innerWidth * dprMax(), innerHeight * dprMax()); smaa.enabled = quality >= 1; comp.addPass(smaa);
}
buildComposer(); layout(); addEventListener('resize', layout);
// 느린 기기: 처음 3초 평균이 40fps 아래면 효과를 한 단계씩 줄임
let fpsT = 0, fpsN = 0;
function adapt(dt) { fpsT += dt; fpsN++; if (fpsT > 3) { const fps = fpsN / fpsT; fpsT = 0; fpsN = 0; if (fps < 40 && quality > 0) { quality--; bloom.enabled = quality >= 2; smaa.enabled = quality >= 1; if (quality === 0) sun.shadow.mapSize.set(1024, 1024); layout(); } } }

// ---------- 입력: 톡·문지르기 ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const pick = (x, y) => { ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam); return ray; };
function plotAt(x, y) {
  const rc = pick(x, y);
  for (const p of plots) { if (rc.intersectObject(p.root, true).length) return p; }
  return null;
}
function water(p, amount) {
  if (phase !== 'play' || p.stage >= 4) return;
  rainPlot = p; raining = Math.max(raining, 0.9); cloudTo.set(p.root.position.x, 3.6, 0.2);
  const before = p.stage; p.grow = Math.min(1, p.grow + amount); p.stage = Math.min(4, Math.floor(p.grow * 4 + 1e-6)); p.wet = 1; p.wig = 0.4;
  if (p.stage !== before) { setStage(p); p.pop = 1; spark(p.root.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xbfffb0, 8); TK.tone(TK.PENTA[(p.stage * 2) % 10] * 2, 0, 0.35, 'sine', 0.15); }
  if (p.stage === 4 && before < 4) { p.signK = 0.0001; TK.sfx.sparkle(); spark(p.root.position.clone().add(new THREE.Vector3(0, 2, 0)), 0xfff3a0, 16); setTimeout(() => HG.read(NAME[p.kind]), 350); if (p.kind === 'egg') { babyDino.visible = true; babyDino.position.copy(p.root.position).add(new THREE.Vector3(0.05, 0.45, 0.1)); } const tw = p.root.position.x < 0 ? twins[0] : twins[1]; tw.hop = 0; TK.sfx.giggle(tw.kind); }
}
let lastRub = 0;
const downs = new Map();
r.domElement.addEventListener('pointerdown', e => {
  e.preventDefault(); TK.audio(); if (window.__paused) return;
  downs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const p = plotAt(e.clientX, e.clientY);
  if (p) { if (p.stage >= 4) { p.pop = 1; HG.read(NAME[p.kind]); } else { water(p, 0.26); TK.sfx.splash && TK.sfx.splash(); } return; }
  // 친구 톡
  const rc = pick(e.clientX, e.clientY);
  for (const t of twins) if (rc.intersectObject(t.g, true).length) { t.hop = 0; TK.sfx.giggle(t.kind); HG.read(t.kind === 'tino' ? '티노' : '코코'); return; }
  const hit = rc.intersectObjects(world.children, true)[0];
  if (hit) spark(world.worldToLocal(hit.point.clone()).add(new THREE.Vector3(0, 0.2, 0)), 0xffffff, 6);
  TK.sfx.soft();
});
r.domElement.addEventListener('pointermove', e => {
  if (!downs.has(e.pointerId) || window.__paused) return;
  const now = performance.now(); if (now - lastRub < 120) return; lastRub = now;
  const p = plotAt(e.clientX, e.clientY); if (p && p.stage < 4) water(p, 0.07);   // 문지르면 조금씩
});
const up = e => downs.delete(e.pointerId); addEventListener('pointerup', up); addEventListener('pointercancel', up);

// ---------- 매 프레임 ----------
const clock = new THREE.Clock(); let T = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  if (!window.__paused) { T += dt; update(dt); adapt(dt); }
  // 팻말 글자 강조 (읽는 글자에 맞춰)
  plots.forEach(p => { if (p.stage >= 4) p.sign.paint(HG.hi(NAME[p.kind])); });
  comp.render();
}
function update(dt) {
  phaseT += dt; wind.value = T;
  cloud.position.lerp(cloudTo, Math.min(1, dt * 3)); cloud.position.y += Math.sin(T * 1.6) * 0.004; cloudFace.rotation.y = Math.sin(T) * 0.2;
  raining = Math.max(0, raining - dt);
  if (raining <= 0) cloudTo.copy(cloudHome());   // 비가 끝나면 구석 제자리로
  drops.forEach(d => {
    if (d.life <= 0 && raining > 0 && Math.random() < 0.5) { d.life = 1; d.m.visible = true; d.m.position.set(cloud.position.x + (Math.random() - 0.5) * 1.6, cloud.position.y - 0.4, cloud.position.z + (Math.random() - 0.5) * 0.7); }
    if (d.life > 0) { d.m.position.y -= dt * 7; d.life -= dt * 1.6; if (d.m.position.y < 0.3) { d.life = 0; d.m.visible = false; } }
  });
  plots.forEach(p => {
    p.wet = Math.max(0, p.wet - dt * 0.25); p.mound.material.color.copy(dry).lerp(wetC, p.wet); p.mound.material.clearcoat = p.wet * 0.6; p.mound.material.roughness = 1 - p.wet * 0.6;
    p.pop = Math.max(0, p.pop - dt * 2.5); p.wig = Math.max(0, p.wig - dt);
    const s = 1 + Math.sin(p.pop * Math.PI) * 0.18; p.plant.scale.set(s, 1 + Math.sin(p.pop * Math.PI) * 0.3, s); p.plant.rotation.z = Math.sin(T * 9) * p.wig * 0.12 + Math.sin(T * 1.3 + p.root.position.x) * 0.03;
    if (p.signK > 0) { p.signK = Math.min(1, p.signK + dt * 2.2); const k = p.signK, b = 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2; /* 살짝 넘쳤다 돌아오는 솟음 */ p.sign.g.scale.setScalar(Math.max(0.001, b)); }
  });
  twins.forEach((t, i) => { if (t.hop >= 0) { t.hop += dt / 0.55; if (t.hop > 1) t.hop = -1; } t.g.position.y = (t.hop >= 0 ? Math.sin(Math.PI * t.hop) * 0.8 : Math.abs(Math.sin(T * 3 + i * 1.5)) * (phase === 'party' ? 0.5 : 0.05)); t.g.lookAt(cam.position.x, t.g.position.y, cam.position.z); });
  butterfly.position.set(Math.sin(T * 0.5) * 4.5, 2.3 + Math.sin(T * 2.3) * 0.4, Math.cos(T * 0.37) * 2.5 - 0.5); butterfly.lookAt(cam.position); butterfly.scale.x = 0.8 + Math.abs(Math.sin(T * 12)) * 0.3;
  if (babyDino.visible) babyDino.lookAt(cam.position.x, babyDino.position.y, cam.position.z);
  for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life -= dt * 1.3; s.v.y -= dt * 4; s.m.position.addScaledVector(s.v, dt); s.m.rotation.x += dt * 5; s.m.material.opacity = Math.max(0, s.life); if (s.life <= 0) { world.remove(s.m); sparks.splice(i, 1); } }
  if (phase === 'play' && plots.length && plots.every(p => p.stage >= 4) && plots.every(p => p.signK >= 1)) { phase = 'party'; phaseT = 0; TK.sfx.fanfare(); twins.forEach(t => t.hop = 0); }
  if (phase === 'party') {
    if (Math.random() < dt * 20) spark(new THREE.Vector3((Math.random() - 0.5) * 10, 3 + Math.random() * 2, (Math.random() - 0.5) * 4), [0xff6fa8, 0xffd54a, 0x8fb8ff, 0x9be37a][(Math.random() * 4) | 0], 1);
    if (phaseT > 1.2 && harvested.children.length < 4) { const k = harvested.children.length, f = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), mat([0xff4f78, 0xff8424, 0xf7f0de, 0xf03a4a][k % 4], { roughness: 0.4, clearcoat: 0.6 })); f.position.set(Math.cos(k * 1.6) * 0.3, 0.62, Math.sin(k * 1.6) * 0.22); harvested.add(f); TK.tone(TK.PENTA[k + 4] * 2, 0, 0.25, 'triangle', 0.12); }
    if (phaseT > 4.5) { phase = 'play'; phaseT = 0; rounds++; setIdx++; babyDino.visible = false; harvested.clear(); newSet(); TK.sfx.sparkle(); }
  }
}

// ---------- 자동 확인·별 시범 ----------
const toScreen = v => { const p = world.localToWorld(v.clone()).project(cam); return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight }; };
window.__g = {
  get phase() { return phase; }, get rounds() { return rounds; }, get quality() { return quality; }, get stages() { return plots.map(p => p.kind + ':' + p.stage); },
  actions() { if (phase !== 'play') return []; const p = plots.find(p => p.stage < 4); if (!p) return []; const s = toScreen(p.root.position.clone().add(new THREE.Vector3(0, 0.3, 0.3))); return [{ type: 'tap', x: s.x, y: s.y, wait: 300 }]; },
};
window.__demo = () => { if (phase !== 'play') return null; const p = plots.find(p => p.stage < 4); if (!p) return null; const s = toScreen(p.root.position.clone().add(new THREE.Vector3(0, 0.3, 0.3))); return { kind: 'tap', x: s.x, y: s.y, say: '흙을 톡 하면 비가 와요' }; };
if (window.TKMusic) TKMusic.play('play');
newSet(); frame();
