import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const STEP = 1.28;
const REST_Y = 0.68;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function cellXZ(index) {
  return [(index % 3 - 1) * STEP, (Math.floor(index / 3) - 1) * STEP];
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function easeInCubic(t) {
  return t ** 3;
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function woodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3b1c16';
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 2) {
    const shade = 48 + (y % 22);
    ctx.strokeStyle = `rgba(${shade + 62}, ${Math.floor(shade * 0.42)}, ${Math.floor(shade * 0.28)}, 0.35)`;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(140, y + Math.sin(y * 0.05) * 8, 320, y - 6, 512, y + Math.sin(y * 0.02) * 5);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function stoneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4a342c';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i += 1) {
    const x = (i * 47) % 256;
    const y = (i * 19) % 256;
    const v = 70 + (i % 40);
    ctx.fillStyle = `rgba(${v + 30}, ${Math.floor(v * 0.62)}, ${Math.floor(v * 0.4)}, 0.28)`;
    ctx.fillRect(x, y, 2, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function shadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 30, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function inscriptionTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = '#e7c98a';
  ctx.font = '600 64px "ZCOOL XiaoWei", "Noto Serif TC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function numberTexture(n) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(12, 8, 6, 0.72)';
  ctx.beginPath();
  ctx.arc(64, 64, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f6ecd8';
  ctx.font = '700 62px "Noto Serif TC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), 64, 70);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x07060b);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x100e14, 14, 28);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
  const introFrom = new THREE.Vector3(0.6, 9.4, 12.8);
  const introTo = new THREE.Vector3(0.42, 5.05, 7.35);
  camera.position.copy(reduceMotion ? introTo : introFrom);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0).texture;
  if ('environmentIntensity' in scene) scene.environmentIntensity = 0.72;
  pmrem.dispose();

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(36, 32, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      fog: false,
      uniforms: {},
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        void main() {
          vec3 dir = normalize(vPos);
          float h = dir.y;
          vec3 top = vec3(0.035, 0.04, 0.07);
          vec3 mid = vec3(0.11, 0.08, 0.12);
          vec3 horizon = vec3(0.28, 0.14, 0.1);
          vec3 col = mix(horizon, mid, smoothstep(-0.2, 0.25, h));
          col = mix(col, top, smoothstep(0.05, 0.8, h));
          vec3 moonDir = normalize(vec3(2.4, 1.7, -1.15));
          float moon = smoothstep(0.045, 0.0, distance(dir, moonDir));
          float glow = smoothstep(0.22, 0.0, distance(dir, moonDir));
          col += vec3(1.0, 0.94, 0.82) * moon;
          col += vec3(0.85, 0.62, 0.35) * glow * 0.45;
          vec3 cell = floor(dir * 42.0);
          float stars = fract(sin(dot(cell, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
          if (stars > 0.985 && h > 0.15) col += vec3(0.85);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  scene.add(sky);

  scene.add(new THREE.HemisphereLight(0xfff0d8, 0x2a1812, 0.85));
  const key = new THREE.DirectionalLight(0xfff2d4, 2.35);
  key.position.set(-4.5, 8.5, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 22;
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fd0ff, 0.55);
  rim.position.set(5, 3.2, -4);
  scene.add(rim);
  const fill = new THREE.PointLight(0xff7a3c, 6, 14, 2);
  fill.position.set(-2.4, 1.4, 2.4);
  scene.add(fill);

  const board = new THREE.Group();
  scene.add(board);

  const gold = new THREE.MeshPhysicalMaterial({
    color: 0xd7b56e,
    metalness: 1,
    roughness: 0.28,
    emissive: 0x3d2c10,
    emissiveIntensity: 0.22,
    clearcoat: 0.4,
  });
  const wood = new THREE.MeshPhysicalMaterial({
    map: woodTexture(),
    color: 0xffffff,
    roughness: 0.55,
    metalness: 0.08,
    clearcoat: 0.35,
    clearcoatRoughness: 0.45,
  });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(4.42, 0.28, 4.42), wood);
  slab.position.y = -0.02;
  slab.castShadow = true;
  slab.receiveShadow = true;
  board.add(slab);

  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(4.02, 0.07, 4.02),
    new THREE.MeshStandardMaterial({ color: 0x120c0b, roughness: 0.72, metalness: 0.1 }),
  );
  lip.position.y = 0.14;
  lip.receiveShadow = true;
  board.add(lip);

  for (const z of [-STEP / 2, STEP / 2]) {
    const groove = new THREE.Mesh(new THREE.BoxGeometry(3.72, 0.028, 0.045), gold);
    groove.position.set(0, 0.19, z);
    board.add(groove);
  }
  for (const x of [-STEP / 2, STEP / 2]) {
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.028, 3.72), gold);
    groove.position.set(x, 0.19, 0);
    board.add(groove);
  }

  const frameGeoH = new THREE.BoxGeometry(4.5, 0.06, 0.06);
  const frameGeoV = new THREE.BoxGeometry(0.06, 0.06, 4.5);
  for (const z of [-2.22, 2.22]) {
    const bar = new THREE.Mesh(frameGeoH, gold);
    bar.position.set(0, 0.02, z);
    board.add(bar);
  }
  for (const x of [-2.22, 2.22]) {
    const bar = new THREE.Mesh(frameGeoV, gold);
    bar.position.set(x, 0.02, 0);
    board.add(bar);
  }
  for (const x of [-2.05, 2.05]) {
    for (const z of [-2.05, 2.05]) {
      const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), gold);
      rivet.position.set(x, 0.16, z);
      rivet.castShadow = true;
      board.add(rivet);
    }
  }

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 0.34),
    new THREE.MeshBasicMaterial({ map: inscriptionTexture('井字過三關'), transparent: true }),
  );
  label.rotation.x = -Math.PI / 2;
  label.position.set(0, 0.2, 1.95);
  board.add(label);
  document.fonts?.ready?.then(() => {
    label.material.map = inscriptionTexture('井字過三關');
    label.material.needsUpdate = true;
  });

  const tileGeo = new THREE.BoxGeometry(1.12, 0.08, 1.12);
  const tileMap = stoneTexture();
  const tiles = [];
  for (let index = 0; index < 9; index += 1) {
    const material = new THREE.MeshStandardMaterial({
      map: tileMap,
      color: 0xffffff,
      roughness: 0.68,
      metalness: 0.12,
      emissive: 0x000000,
      emissiveIntensity: 1,
    });
    const tile = new THREE.Mesh(tileGeo, material);
    const [x, z] = cellXZ(index);
    tile.position.set(x, 0.2, z);
    tile.receiveShadow = true;
    tile.userData.index = index;
    board.add(tile);
    tiles.push(tile);
  }

  const stage = new THREE.Mesh(
    new THREE.CylinderGeometry(3.55, 3.75, 0.14, 72),
    new THREE.MeshStandardMaterial({ color: 0x141014, roughness: 0.38, metalness: 0.55 }),
  );
  stage.position.y = -0.32;
  stage.receiveShadow = true;
  board.add(stage);
  const ringPivot = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.018, 8, 90), gold);
  ring.rotation.x = Math.PI / 2;
  ringPivot.add(ring);
  ringPivot.position.y = -0.24;
  board.add(ringPivot);

  const blot = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 7.2),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }),
  );
  blot.rotation.x = -Math.PI / 2;
  blot.position.y = -0.4;
  board.add(blot);

  const shared = {
    bar: new THREE.CapsuleGeometry(0.068, 0.72, 4, 12),
    torus: new THREE.TorusGeometry(0.33, 0.07, 18, 48),
    inner: new THREE.TorusGeometry(0.33, 0.016, 8, 40),
    core: new THREE.SphereGeometry(0.07, 16, 12),
    spark: new THREE.SphereGeometry(0.035, 8, 8),
  };

  function makePiece(player, { n, numbered, ghost = false } = {}) {
    const group = new THREE.Group();
    if (player === 'X') {
      const material = new THREE.MeshPhysicalMaterial({
        color: 0xf2c56a,
        metalness: 1,
        roughness: 0.2,
        emissive: 0x6a4a12,
        emissiveIntensity: ghost ? 0.1 : 0.3,
        clearcoat: 0.55,
        clearcoatRoughness: 0.25,
        transparent: ghost,
        opacity: ghost ? 0.38 : 1,
        depthWrite: !ghost,
      });
      const a = new THREE.Mesh(shared.bar, material);
      const b = new THREE.Mesh(shared.bar, material);
      a.rotation.z = Math.PI / 4;
      b.rotation.z = -Math.PI / 4;
      a.castShadow = b.castShadow = !ghost;
      group.add(a, b);
      const core = new THREE.Mesh(
        shared.core,
        new THREE.MeshBasicMaterial({
          color: 0xfff1c4,
          transparent: ghost,
          opacity: ghost ? 0.4 : 1,
          depthWrite: !ghost,
        }),
      );
      group.add(core);
    } else {
      const material = new THREE.MeshPhysicalMaterial({
        color: 0x3ec7a4,
        metalness: 0.25,
        roughness: 0.16,
        emissive: 0x0d6a54,
        emissiveIntensity: ghost ? 0.15 : 0.55,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        transmission: ghost ? 0 : 0.18,
        thickness: 0.4,
        transparent: ghost,
        opacity: ghost ? 0.4 : 1,
        depthWrite: !ghost,
      });
      const ringMesh = new THREE.Mesh(shared.torus, material);
      ringMesh.castShadow = !ghost;
      const glow = new THREE.Mesh(
        shared.inner,
        new THREE.MeshBasicMaterial({
          color: 0xd7fff3,
          transparent: true,
          opacity: ghost ? 0.25 : 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      group.add(ringMesh, glow);
    }
    if (numbered && n) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: numberTexture(n), transparent: true, depthWrite: false }),
      );
      sprite.position.set(0.34, 0.42, 0.1);
      sprite.scale.set(0.28, 0.28, 0.28);
      group.add(sprite);
    }
    group.traverse((obj) => {
      if (ghost) obj.raycast = () => {};
    });
    return group;
  }

  const pieceRoot = new THREE.Group();
  board.add(pieceRoot);
  const pieceMap = Array(9).fill(null);
  const occupancy = Array(9).fill(null);

  const ghostX = makePiece('X', { ghost: true });
  const ghostO = makePiece('O', { ghost: true });
  ghostX.visible = false;
  ghostO.visible = false;
  board.add(ghostX, ghostO);

  const threat = new THREE.Mesh(
    new THREE.TorusGeometry(0.46, 0.016, 8, 40),
    new THREE.MeshBasicMaterial({ color: 0xffb15a, transparent: true, opacity: 0.95 }),
  );
  threat.rotation.x = Math.PI / 2;
  threat.visible = false;
  board.add(threat);

  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.09, 0.09),
    new THREE.MeshBasicMaterial({
      color: 0xffe7b0,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  beam.visible = false;
  board.add(beam);

  function makeLantern() {
    const group = new THREE.Group();
    const paper = new THREE.MeshStandardMaterial({
      color: 0x4e453c,
      emissive: 0x000000,
      roughness: 0.85,
    });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), paper);
    body.scale.y = 1.18;
    group.add(body);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.08, 16), gold);
    cap.position.y = 0.3;
    group.add(cap);
    const tassel = new THREE.Mesh(
      new THREE.ConeGeometry(0.035, 0.22, 8),
      new THREE.MeshStandardMaterial({ color: 0x8d1d2c, roughness: 0.6 }),
    );
    tassel.position.y = -0.4;
    group.add(tassel);
    const string = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.62, 6),
      new THREE.MeshStandardMaterial({ color: 0x6a5438 }),
    );
    string.position.y = 0.58;
    group.add(string);
    const light = new THREE.PointLight(0xffc58a, 0, 5.5, 2);
    group.add(light);
    group.userData.paper = paper;
    group.userData.light = light;
    return group;
  }

const lanterns = [
  [-2.45, 1.72, -1.25],
  [0, 2.05, -1.7],
  [2.45, 1.72, -1.25],
].map((spot, i) => {
  const lantern = makeLantern();
  lantern.position.set(spot[0], spot[1], spot[2]);
  lantern.scale.setScalar(i === 1 ? 1.08 : 0.96);
  scene.add(lantern);
  return lantern;
});

  const dustCount = 140;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  const dustSpeed = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i += 1) {
    dustPos[i * 3] = ((i * 37) % 100) / 10 - 5;
    dustPos[i * 3 + 1] = ((i * 17) % 50) / 10;
    dustPos[i * 3 + 2] = ((i * 29) % 80) / 10 - 4;
    dustSpeed[i] = 0.05 + (i % 7) * 0.02;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: 0xefd7a4,
      size: 0.03,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  scene.add(dust);

  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.7;
  controls.minDistance = 5.6;
  controls.maxDistance = 11;
  controls.minPolarAngle = 0.55;
  controls.maxPolarAngle = 1.18;
  controls.target.set(0, 0.15, -0.05);
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.45;
  let intro = reduceMotion ? 2 : 0;
  let userMoved = false;
  controls.addEventListener('start', () => {
    userMoved = true;
    controls.autoRotate = false;
    intro = 2;
  });

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.4, 0.86);
  composer.addPass(bloom);

  const tweens = [];
  const sparks = [];
  const waves = [];
  let fx = 0;
  let shake = 0;
  let turnSymbol = null;
  let hover = null;
  let threatIndex = null;
  let winSet = new Set();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function tween(obj, props, { duration, ease, onUpdate, onDone } = {}) {
    for (let i = tweens.length - 1; i >= 0; i -= 1) {
      if (tweens[i].obj === obj) tweens.splice(i, 1);
    }
    const from = {};
    for (const key of Object.keys(props)) from[key] = obj[key];
    tweens.push({
      obj,
      props,
      from,
      duration: reduceMotion ? 1 : duration,
      ease: ease || easeOutCubic,
      onUpdate,
      onDone,
      start: performance.now(),
    });
  }

  function updateTweens(now) {
    for (let i = tweens.length - 1; i >= 0; i -= 1) {
      const job = tweens[i];
      const t = Math.min(1, (now - job.start) / job.duration);
      const eased = job.ease(t);
      for (const key of Object.keys(job.props)) {
        job.obj[key] = job.from[key] + (job.props[key] - job.from[key]) * eased;
      }
      job.onUpdate?.();
      if (t >= 1) {
        tweens.splice(i, 1);
        job.onDone?.();
      }
    }
  }

  function disposePiece(group) {
    group.traverse((obj) => {
      if (!obj.material) return;
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const material of materials) {
        if (material.map && material.map !== tileMap) material.map.dispose();
        material.dispose();
      }
    });
  }

  function clearPieces() {
    tweens.length = 0;
    for (const piece of pieceMap) {
      if (!piece) continue;
      pieceRoot.remove(piece);
      disposePiece(piece);
    }
    pieceMap.fill(null);
    occupancy.fill(null);
  }

  function setPieces(marks, numbered) {
    clearPieces();
    for (const mark of marks || []) {
      const piece = makePiece(mark.player, { n: mark.n, numbered });
      const [x, z] = cellXZ(mark.index);
      piece.position.set(x, REST_Y, z);
      pieceRoot.add(piece);
      pieceMap[mark.index] = piece;
      occupancy[mark.index] = mark.player;
    }
  }

  function burst(pos, color, count, power = 1) {
    for (let i = 0; i < count; i += 1) {
      const mesh = new THREE.Mesh(
        shared.spark,
        new THREE.MeshBasicMaterial({ color, transparent: true }),
      );
      mesh.position.copy(pos);
      board.add(mesh);
      const angle = (i / count) * Math.PI * 2;
      sparks.push({
        mesh,
        v: new THREE.Vector3(Math.cos(angle) * 1.6, 1.2 + (i % 5) * 0.28, Math.sin(angle) * 1.6).multiplyScalar(power),
        life: 0,
        max: 0.5 + (i % 4) * 0.08,
      });
    }
  }

  function shockwave(x, z, color) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.17, 32),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.28, z);
    board.add(mesh);
    waves.push({ mesh, life: 0, max: 0.45 });
  }

  function placePiece(index, player, n, numbered) {
    if (pieceMap[index]) {
      pieceRoot.remove(pieceMap[index]);
      disposePiece(pieceMap[index]);
    }
    const piece = makePiece(player, { n, numbered });
    const [x, z] = cellXZ(index);
    piece.position.set(x, 2.75, z);
    piece.scale.setScalar(0.32);
    piece.rotation.x = player === 'O' ? 1.05 : -0.65;
    piece.rotation.z = player === 'O' ? Math.PI : 0.45;
    pieceRoot.add(piece);
    pieceMap[index] = piece;
    occupancy[index] = player;
    const duration = player === 'X' ? 480 : 560;
    tween(piece.position, { y: REST_Y }, { duration, ease: easeOutBack });
    tween(piece.rotation, { x: 0, z: 0 }, { duration, ease: easeOutCubic });
    const scale = { s: 0.32 };
    tween(scale, { s: 1 }, {
      duration,
      ease: easeOutBack,
      onUpdate: () => piece.scale.setScalar(scale.s),
    });
    window.setTimeout(() => {
      if (pieceMap[index] !== piece) return;
      shockwave(x, z, player === 'X' ? 0xf0c56a : 0x9dffe6);
      burst(new THREE.Vector3(x, 0.45, z), player === 'X' ? 0xffe2a4 : 0xd9fff4, player === 'X' ? 16 : 12);
      shake = 1;
    }, duration * 0.7);
  }

  function removePiece(index) {
    const piece = pieceMap[index];
    if (!piece) return;
    pieceMap[index] = null;
    occupancy[index] = null;
    burst(piece.position.clone(), 0xffe1a8, 12, 0.7);
    tween(piece.position, { y: piece.position.y + 0.95 }, { duration: 380, ease: easeInCubic });
    tween(piece.scale, { x: 0.01, y: 0.01, z: 0.01 }, { duration: 380, ease: easeInCubic });
    window.setTimeout(() => {
      piece.parent?.remove(piece);
      disposePiece(piece);
    }, reduceMotion ? 0 : 400);
  }

  function paintGates(view) {
    lanterns.forEach((lantern, index) => {
      const owner = view.gates?.[index] || null;
      const current = view.phase === 'playing' && view.gate === index;
      const paper = lantern.userData.paper;
      const light = lantern.userData.light;
      const colors = { X: 0xffc56b, O: 0x8dffe4, draw: 0xd07070 };
      if (owner && owner !== 'draw') {
        paper.emissive.setHex(colors[owner]);
        paper.emissiveIntensity = 0.4;
        paper.color.setHex(owner === 'O' ? 0x8fd9c8 : 0xe0b15a);
        light.color.setHex(colors[owner]);
        light.intensity = 0.12;
      } else if (owner === 'draw') {
        paper.emissive.setHex(colors.draw);
        paper.emissiveIntensity = 0.4;
        paper.color.setHex(0x6a3030);
        light.color.setHex(colors.draw);
        light.intensity = 0.08;
      } else if (current) {
        paper.emissive.setHex(0x6a5432);
        paper.emissiveIntensity = 0.4;
        paper.color.setHex(0x8d7358);
        light.color.setHex(0xffc58a);
        light.intensity = 0.08;
      } else {
        paper.emissive.setHex(0x000000);
        paper.emissiveIntensity = 0;
        paper.color.setHex(0x4a4038);
        light.intensity = 0;
      }
    });
  }

  function setThreat(index) {
    threatIndex = index ?? null;
    if (threatIndex == null) {
      threat.visible = false;
      return;
    }
    const [x, z] = cellXZ(threatIndex);
    threat.position.set(x, 0.3, z);
    threat.visible = true;
  }

  function clearCelebration() {
    winSet = new Set();
    beam.visible = false;
    for (const tile of tiles) {
      if (!winSet.has(tile.userData.index) && tile.userData.index !== hover) {
        tile.material.emissive.setHex(0x000000);
      }
    }
    for (const piece of pieceMap) {
      if (!piece) continue;
      piece.userData.win = false;
      piece.traverse((obj) => {
        if (obj.material?.emissive && obj.userData.baseIntensity != null) {
          obj.material.emissiveIntensity = obj.userData.baseIntensity;
        }
      });
    }
    applyHover();
  }

  function celebrate(line, player, big) {
    clearCelebration();
    winSet = new Set(line);
    const color = player === 'X' ? 0xffe7b5 : 0xdcfff4;
    for (const index of line) {
      tiles[index].material.emissive.setHex(player === 'X' ? 0x8a6420 : 0x1c6d5c);
      tiles[index].material.emissiveIntensity = 0.85;
      const piece = pieceMap[index];
      if (!piece) continue;
      piece.userData.win = true;
      piece.traverse((obj) => {
        if (!obj.material?.emissive) return;
        if (obj.userData.baseIntensity == null) obj.userData.baseIntensity = obj.material.emissiveIntensity;
      });
    }
    const [x0, z0] = cellXZ(line[0]);
    const [x1, z1] = cellXZ(line[2]);
    const start = new THREE.Vector3(x0, 1.05, z0);
    const end = new THREE.Vector3(x1, 1.05, z1);
    const length = Math.max(0.001, start.distanceTo(end));
    beam.position.copy(start).lerp(end, 0.5);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), end.clone().sub(start).normalize());
    beam.material.color.setHex(color);
    beam.visible = true;
    beam.scale.set(0.01, 1, 1);
    tween(beam.scale, { x: length }, { duration: 420, ease: easeOutCubic });
    burst(start.clone().lerp(end, 0.5), color, big ? 34 : 16, big ? 1.45 : 1);
    if (big) {
      burst(new THREE.Vector3(0, 1.3, 0), 0xf2c56a, 22, 1.7);
      burst(new THREE.Vector3(0, 1.3, 0), 0xb8fff0, 22, 1.5);
    }
    shake = 1;
  }

  function clearSparks() {
    for (const spark of sparks) {
      spark.mesh.parent?.remove(spark.mesh);
      spark.mesh.material.dispose();
    }
    sparks.length = 0;
  }

  function sweep(token, onDone) {
    clearSparks();
    const pieces = pieceMap.filter(Boolean);
    if (!pieces.length) {
      clearPieces();
      onDone?.();
      return;
    }
    for (const piece of pieces) {
      tween(piece.position, { y: piece.position.y + 1.35 }, { duration: 420, ease: easeInCubic });
      tween(piece.scale, { x: 0.01, y: 0.01, z: 0.01 }, { duration: 420, ease: easeInCubic });
    }
    window.setTimeout(() => {
      if (token !== fx) return;
      clearPieces();
      onDone?.();
    }, reduceMotion ? 0 : 430);
  }

  function applyHover() {
    for (const tile of tiles) {
      if (winSet.has(tile.userData.index)) continue;
      const active = tile.userData.index === hover && occupancy[tile.userData.index] == null && turnSymbol;
      tile.material.emissive.setHex(active ? 0x6a5424 : 0x000000);
      tile.material.emissiveIntensity = active ? 0.65 : 1;
    }
    const show = hover != null && occupancy[hover] == null && turnSymbol;
    ghostX.visible = Boolean(show && turnSymbol === 'X');
    ghostO.visible = Boolean(show && turnSymbol === 'O');
    if (show) {
      const [x, z] = cellXZ(hover);
      const ghost = turnSymbol === 'X' ? ghostX : ghostO;
      ghost.position.set(x, REST_Y, z);
    }
    canvas.style.cursor = show ? 'pointer' : 'grab';
  }

  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(tiles, false)[0];
    return hit ? hit.object.userData.index : null;
  }

  let down = null;
  canvas.addEventListener('pointerdown', (event) => {
    down = { x: event.clientX, y: event.clientY };
    intro = 2;
  });
  canvas.addEventListener('pointerup', (event) => {
    if (!down) return;
    const dx = event.clientX - down.x;
    const dy = event.clientY - down.y;
    down = null;
    if (dx * dx + dy * dy > 25) return;
    const index = pick(event);
    if (index == null || !turnSymbol || occupancy[index]) return;
    api.onPick?.(index);
  });
  canvas.addEventListener('pointermove', (event) => {
    hover = pick(event);
    applyHover();
  });
  canvas.addEventListener('pointerleave', () => {
    hover = null;
    applyHover();
  });

  function homeFrame() {
    const width = canvas.clientWidth || window.innerWidth;
    const narrow = width < 800;
    return {
      position: narrow ? new THREE.Vector3(0.15, 7.1, 10.6) : introTo,
      target: narrow ? new THREE.Vector3(0, -0.85, -0.2) : new THREE.Vector3(0, 0.12, -0.2),
    };
  }

  function resize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
    if (intro >= 1.7 && !userMoved) {
      const frame = homeFrame();
      camera.position.copy(frame.position);
      controls.target.copy(frame.target);
      controls.update();
    }
  }

  const api = {
    onPick: null,
    setTurn(symbol) {
      turnSymbol = symbol;
      if (!turnSymbol) {
        ghostX.visible = false;
        ghostO.visible = false;
      }
      applyHover();
    },
    setAutoRotate(on) {
      if (on) userMoved = false;
      controls.autoRotate = Boolean(on) && !userMoved && intro >= 2;
    },
    sync(view, { animate = false, onReady } = {}) {
      const token = ++fx;
      paintGates(view);
      setThreat(view.threatened);
      const numbered = view.rules === 'vanish';
      if (!animate) {
        clearCelebration();
        setPieces(view.marks, numbered);
        if (view.outcome?.line) celebrate(view.outcome.line, view.outcome.player, view.phase === 'match_end');
        onReady?.();
        return;
      }
      if (view.fresh) {
        clearCelebration();
        sweep(token, () => {
          if (token !== fx) return;
          setPieces(view.marks, numbered);
          onReady?.();
        });
        return;
      }
      if (view.removed) removePiece(view.removed.index);
      if (view.placed) {
        const mark = (view.marks || []).find((item) => item.index === view.placed.index);
        placePiece(view.placed.index, view.placed.player, mark?.n, numbered);
      }
      if (view.outcome?.line) {
        const { line, player } = view.outcome;
        const big = view.phase === 'match_end';
        window.setTimeout(() => {
          if (token !== fx) return;
          celebrate(line, player, big);
        }, reduceMotion ? 0 : 500);
      } else if (view.phase === 'playing') clearCelebration();
      onReady?.();
    },
    resize,
    frameHome() {
      intro = 2;
      controls.autoRotate = false;
      const frame = homeFrame();
      camera.position.copy(frame.position);
      controls.target.copy(frame.target);
      controls.update();
    },
  };

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    updateTweens(now);
    if (intro < 1.7) {
      intro += dt;
      const framing = homeFrame();
      const k = easeOutCubic(Math.min(1, intro / 1.7));
      camera.position.lerpVectors(introFrom, framing.position, k);
      camera.lookAt(framing.target);
      if (intro >= 1.7) {
        controls.target.copy(framing.target);
        controls.update();
      }
    } else {
      if (!userMoved) controls.autoRotate = controls.autoRotate;
      controls.update();
    }

    const time = now / 1000;
    board.position.y = Math.sin(time * 0.9) * 0.035;
    if (shake > 0) {
      board.position.x = (Math.random() - 0.5) * 0.03 * shake;
      board.position.z = (Math.random() - 0.5) * 0.03 * shake;
      shake *= 0.88;
      if (shake < 0.04) {
        shake = 0;
        board.position.x = 0;
        board.position.z = 0;
      }
    } else {
      board.position.x = 0;
      board.position.z = 0;
    }
    ringPivot.rotation.y += dt * 0.25;
    gold.emissiveIntensity = 0.18 + Math.sin(time * 1.6) * 0.05;
    lanterns.forEach((lantern, index) => {
      lantern.rotation.z = Math.sin(time * 0.8 + index) * 0.05;
    });
    if (threat.visible) {
      const pulse = 1 + Math.sin(time * 5) * 0.06;
      threat.scale.setScalar(pulse);
      threat.material.opacity = 0.55 + Math.sin(time * 5) * 0.35;
    }
    if (ghostX.visible) ghostX.position.y = REST_Y + Math.sin(time * 4) * 0.035;
    if (ghostO.visible) ghostO.position.y = REST_Y + Math.sin(time * 4) * 0.035;
    for (const piece of pieceMap) {
      if (!piece?.userData.win) continue;
      const pulse = 0.35 + Math.sin(time * 7) * 0.28;
      piece.traverse((obj) => {
        if (obj.material?.emissive) obj.material.emissiveIntensity = pulse;
      });
      piece.position.y = REST_Y + Math.sin(time * 6 + piece.position.x) * 0.04;
    }

    const positions = dust.geometry.attributes.position;
    for (let i = 0; i < dustCount; i += 1) {
      let y = positions.getY(i) + dustSpeed[i] * dt;
      if (y > 4.8) y = 0;
      positions.setY(i, y);
    }
    positions.needsUpdate = true;

    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const spark = sparks[i];
      spark.life += dt;
      spark.v.y -= dt * 4.2;
      spark.mesh.position.addScaledVector(spark.v, dt);
      const k = spark.life / spark.max;
      spark.mesh.material.opacity = Math.max(0, 1 - k);
      if (k >= 1) {
        board.remove(spark.mesh);
        spark.mesh.material.dispose();
        sparks.splice(i, 1);
      }
    }
    for (let i = waves.length - 1; i >= 0; i -= 1) {
      const wave = waves[i];
      wave.life += dt;
      const k = wave.life / wave.max;
      wave.mesh.scale.setScalar(0.5 + k * 2.4);
      wave.mesh.material.opacity = 0.75 * (1 - k);
      if (k >= 1) {
        board.remove(wave.mesh);
        wave.mesh.geometry.dispose();
        wave.mesh.material.dispose();
        waves.splice(i, 1);
      }
    }

    composer.render();
    requestAnimationFrame(frame);
  }

  resize();
  paintGates({ gates: [null, null, null], gate: 0, phase: 'playing' });
  requestAnimationFrame(frame);
  return api;
}
