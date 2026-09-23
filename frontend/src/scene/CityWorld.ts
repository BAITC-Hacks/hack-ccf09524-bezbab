import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { districtNames } from "../data/initiatives";
import type { Initiative } from "../data/initiatives";
import { districtLayout, visualPlan } from "./cityPlan";

type Shape = "box" | "cylinder" | "leaf" | "cone";
type BatchItem = {
  shape: Shape;
  color: string;
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  ry?: number;
  facade?: boolean;
};
class Batches {
  items: BatchItem[] = [];
  private world: CityWorld;
  constructor(world: CityWorld) {
    this.world = world;
  }
  box(
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    color: string,
    facade = false,
    ry = 0,
  ) {
    this.items.push({ shape: "box", x, y, z, sx, sy, sz, color, facade, ry });
  }
  shape(
    shape: Shape,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    color: string,
  ) {
    this.items.push({ shape, x, y, z, sx, sy, sz, color });
  }
  tree(x: number, z: number, size = 1, color = "#76a46b") {
    this.shape(
      "cylinder",
      x,
      0.55 * size,
      z,
      0.22 * size,
      1.1 * size,
      0.22 * size,
      "#937c63",
    );
    this.shape(
      "leaf",
      x,
      1.5 * size,
      z,
      1.05 * size,
      1.25 * size,
      1.05 * size,
      color,
    );
  }
  lamp(x: number, z: number) {
    this.box(x, 1.45, z, 0.12, 2.9, 0.12, "#596c80");
    this.box(x + 0.3, 2.85, z, 0.7, 0.1, 0.12, "#596c80");
    this.box(x + 0.55, 2.78, z, 0.3, 0.12, 0.3, "#ffedaa");
    this.shape("cylinder", x + 0.55, 0.065, z, 1.3, 0.012, 1.3, "#ebd7a2");
  }
  build() {
    const group = new THREE.Group();
    const buckets = new Map<string, BatchItem[]>();
    for (const item of this.items) {
      const key = `${item.shape}:${item.color}:${!!item.facade}`;
      const bucket = buckets.get(key) || [];
      bucket.push(item);
      buckets.set(key, bucket);
    }
    const transform = new THREE.Object3D();
    for (const bucket of buckets.values()) {
      const first = bucket[0];
      const mesh = new THREE.InstancedMesh(
        this.world.geometries[first.shape],
        this.world.material(first.color, first.facade),
        bucket.length,
      );
      bucket.forEach((item, index) => {
        transform.position.set(item.x, item.y, item.z);
        transform.rotation.set(0, item.ry || 0, 0);
        transform.scale.set(item.sx, item.sy, item.sz);
        transform.updateMatrix();
        mesh.setMatrixAt(index, transform.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }
}
export class CityWorld {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300);
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;
  readonly geometries = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
    leaf: new THREE.IcosahedronGeometry(1, 1),
    cone: new THREE.ConeGeometry(1, 1, 8),
  };
  private materials = new Map<string, THREE.MeshLambertMaterial>();
  private facadeTexture: THREE.CanvasTexture;
  private hemisphere = new THREE.HemisphereLight("#e6f3ff", "#afa58d", 2.4);
  private sun = new THREE.DirectionalLight("#fff2d3", 3);
  private districts: THREE.Mesh[] = [];
  private labels: THREE.Sprite[] = [];
  private improvements = new THREE.Group();
  private cars: {
    group: THREE.Group;
    x: number;
    z: number;
    phase: number;
    bus: boolean;
  }[] = [];
  private busGroups: THREE.Group[] = [];
  private before = false;
  private motion = true;
  private night = false;
  private alive = true;
  private visible = true;
  private frame = 0;
  private previous = 0;
  private elapsed = 0;
  private observer: ResizeObserver;
  private intersection: IntersectionObserver;
  private pointer = new THREE.Vector2();
  private down = { x: 0, y: 0 };
  private raycaster = new THREE.Raycaster();
  private ring: THREE.LineLoop;
  private selected = "yesil";
  private currentKey = "";
  private readonly onSelect: (id: string) => void;
  private readonly onLost: () => void;
  private host: HTMLElement;
  constructor(
    host: HTMLElement,
    onSelect: (id: string) => void,
    onLost: () => void,
  ) {
    this.host = host;
    this.onSelect = onSelect;
    this.onLost = onLost;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = host.clientWidth > 600;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "3D-модель Астаны. Перетащите для вращения, прокрутите для приближения.",
    );
    this.renderer.domElement.setAttribute("role", "img");
    host.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color("#e8eff7");
    this.scene.fog = new THREE.Fog("#e8eff7", 100, 220);
    this.camera.position.set(62, 66, 78);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.minDistance = 22;
    this.controls.maxDistance = 130;
    this.controls.minPolarAngle = 0.22;
    this.controls.maxPolarAngle = Math.PI / 2.45;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.65;
    this.controls.zoomSpeed = 0.8;
    this.controls.update();
    this.controls.saveState();
    this.scene.add(this.hemisphere);
    this.sun.position.set(-40, 65, 30);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -60;
    this.sun.shadow.camera.right = 60;
    this.sun.shadow.camera.top = 60;
    this.sun.shadow.camera.bottom = -60;
    this.sun.shadow.normalBias = 0.08;
    this.scene.add(this.sun);
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = 64;
    textureCanvas.height = 128;
    const context = textureCanvas.getContext("2d")!;
    context.fillStyle = "#dce3e8";
    context.fillRect(0, 0, 64, 128);
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 4; col++) {
        context.fillStyle = (row + col) % 5 === 0 ? "#e6d8b2" : "#839cae";
        context.fillRect(5 + col * 15, 7 + row * 15, 7, 8);
      }
    this.facadeTexture = new THREE.CanvasTexture(textureCanvas);
    this.facadeTexture.colorSpace = THREE.SRGBColorSpace;
    this.buildBase();
    const outline = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-15, 0.13, -12),
      new THREE.Vector3(15, 0.13, -12),
      new THREE.Vector3(15, 0.13, 12),
      new THREE.Vector3(-15, 0.13, 12),
    ]);
    this.ring = new THREE.LineLoop(
      outline,
      new THREE.LineBasicMaterial({ color: "#3b63f0" }),
    );
    this.scene.add(this.ring);
    this.focus("yesil", false);
    this.scene.add(this.improvements);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.intersection = new IntersectionObserver((entries) => {
      this.visible = entries[0].isIntersecting;
    });
    this.intersection.observe(host);
    this.renderer.domElement.addEventListener("pointerdown", this.pointerDown);
    this.renderer.domElement.addEventListener("pointerup", this.pointerUp);
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    this.resize();
    this.frame = requestAnimationFrame(this.tick);
  }
  material(color: string, facade = false) {
    const key = `${color}:${facade}`;
    let material = this.materials.get(key);
    if (!material) {
      material = new THREE.MeshLambertMaterial({
        color,
        map: facade ? this.facadeTexture : null,
      });
      if (this.night && facade) {
        material.emissive.set("#a38a55");
        material.emissiveIntensity = 0.2;
      }
      this.materials.set(key, material);
    }
    return material;
  }
  private buildBase() {
    const b = new Batches(this);
    b.box(0, -1.1, 0, 76, 2, 68, "#c6d1d5");
    b.box(0, -0.12, 0, 75, 0.22, 67, "#d7dfcc");
    b.box(0, 0.015, 0, 75, 0.04, 7, "#78bdc9");
    // Pale embankments, two bridges and a waterfront promenade.
    b.box(0, 0.06, -4.1, 75, 0.2, 1.1, "#ede9db");
    b.box(0, 0.06, 4.1, 75, 0.2, 1.1, "#ede9db");
    for (const x of [-19, 19]) {
      b.box(x, 0.38, 0, 3.4, 0.6, 10, "#a4b3bc");
      b.box(x, 0.71, 0, 2.9, 0.08, 10, "#667b87");
      for (const side of [-1, 1])
        b.box(x + side * 1.57, 0.95, 0, 0.08, 0.5, 10, "#e9e9df");
    }
    for (let x = -32; x < 34; x += 4)
      b.box(x, 0.05, 0, 1.3, 0.01, 0.08, "#a3d5dc");
    const buildingColors = [
      "#dbe2df",
      "#e7dccc",
      "#d2d8d8",
      "#c3d1dc",
      "#e7e6e0",
    ];
    districtLayout.forEach((d, index) => {
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(30, 0.08, 24),
        new THREE.MeshLambertMaterial({
          color: d.color,
          transparent: true,
          opacity: 0.12,
        }),
      );
      pad.position.set(d.x, 0.02, d.z);
      pad.userData.districtId = d.id;
      this.scene.add(pad);
      this.districts.push(pad);
      // Each quarter has one avenue, side streets and reserved initiative plots.
      b.box(d.x, 0.08, d.z, 2.9, 0.12, 24, "#72828b");
      b.box(d.x, 0.08, d.z - 1, 30, 0.12, 2.6, "#72828b");
      for (const dz of [-10, 10])
        b.box(d.x + 4.5, 0.075, d.z + dz, 12, 0.1, 1.5, "#9aa6aa");
      for (const dx of [-10, 10])
        b.box(d.x + dx, 0.065, d.z, 1.8, 0.08, 23, "#9aa6aa");
      for (let t = -11; t <= 11; t += 2.4) {
        b.box(d.x, 0.15, d.z + t, 0.09, 0.01, 0.9, "#ece4c6");
        b.box(d.x + t, 0.15, d.z - 1, 0.9, 0.01, 0.08, "#ece4c6");
      }
      for (const dx of [-12, -6, 6, 12])
        for (const dz of [-8, -4, 5, 9]) {
          // Leave the central southern plots free for parks and civic buildings.
          if (Math.abs(dx) === 6 && dz > 0) continue;
          const seed = Math.abs(dx * 31 + dz * 17 + index * 83);
          const tall = d.id === "yesil" ? 1.35 : 1;
          const h = (2.2 + (seed % 7) * 0.5) * tall;
          b.box(
            d.x + dx,
            h / 2 + 0.18,
            d.z + dz,
            2.5,
            h,
            2.5,
            buildingColors[seed % buildingColors.length],
            true,
          );
          b.box(d.x + dx, h + 0.23, d.z + dz, 2.7, 0.2, 2.7, "#d9e0df");
          b.box(d.x + dx + 0.65, h + 0.48, d.z + dz, 0.6, 0.4, 0.7, "#a5b6bf");
        }
      b.box(d.x - 5.7, 0.04, d.z + 6.4, 6.3, 0.04, 6.1, "#c1cbb2");
      b.box(d.x + 5.7, 0.04, d.z + 6.4, 6.3, 0.04, 6.1, "#d8d4c5");
      for (let i = 0; i < 7; i++) {
        const x = d.x - 13 + (i % 4) * 7.5;
        const z = d.z + (i < 4 ? -11 : 11);
        b.tree(x, z, 0.6 + (i % 3) * 0.13, i % 2 ? "#8aa57b" : "#729a75");
      }
      // Existing school, so the school safety decision has a visible target.
      b.box(d.x + 5, 1.05, d.z - 8, 4.2, 1.8, 2.6, "#d6be8d", true);
      b.box(d.x + 5, 2.02, d.z - 8, 4.5, 0.18, 2.9, "#567f9c");
      for (let i = 0; i < 3; i++) {
        const car = this.vehicle(
          i === 0 ? "#e7b075" : i === 1 ? "#dbe1e8" : "#6295bc",
          false,
        );
        this.scene.add(car);
        this.cars.push({
          group: car,
          x: d.x,
          z: d.z,
          phase: (i / 3 + index * 0.13) % 1,
          bus: false,
        });
      }
      this.label(districtNames[d.id], d.x, d.z + 13.2, d.color);
    });
    // A stylised Baiterek at the civic plaza between the southern districts.
    b.shape("cylinder", 0, 0.12, 17, 3.8, 0.18, 3.8, "#e6e1d2");
    b.shape("cylinder", 0, 0.25, 17, 2.5, 0.12, 2.5, "#d1dce5");
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      b.shape(
        "cylinder",
        Math.cos(a) * 0.55,
        3.7,
        17 + Math.sin(a) * 0.55,
        0.085,
        7,
        0.085,
        "#efeee1",
      );
    }
    b.shape("cylinder", 0, 5.7, 17, 0.85, 0.16, 0.85, "#f0eee0");
    b.shape("leaf", 0, 7.3, 17, 1.6, 1.6, 1.6, "#d9b261");
    // Architectural accent: glass office tower and a stepped roof.
    b.box(-3, 4, -17, 2.5, 8, 3, "#6b9bb2", true);
    b.box(-3, 8.3, -17, 2, 0.5, 2.5, "#a4c6d2");
    this.scene.add(b.build());
  }
  private label(text: string, x: number, z: number, color: string) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(3, 3, 250, 57, 12);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(24, 32, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3b4d68";
    ctx.font = "600 26px Arial";
    ctx.textAlign = "center";
    ctx.fillText(text, 140, 40);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, depthTest: false }),
    );
    sprite.scale.set(10, 2.5, 1);
    sprite.position.set(x, 2, z);
    sprite.renderOrder = 10;
    this.scene.add(sprite);
    this.labels.push(sprite);
  }
  private vehicle(color: string, bus: boolean) {
    const b = new Batches(this);
    const length = bus ? 2.1 : 1.25;
    b.box(0, 0.38, 0, 0.66, 0.48, length, color);
    b.box(0, 0.66, -0.05, 0.55, 0.24, length * 0.65, "#c3ddeb");
    for (const x of [-0.35, 0.35])
      for (const z of [-length * 0.3, length * 0.3])
        b.box(x, 0.19, z, 0.12, 0.26, 0.3, "#3e4d59");
    return b.build();
  }
  setSelection(selection: Initiative[]) {
    const key = selection
      .map((i) => i.id)
      .sort()
      .join(",");
    if (key === this.currentKey) return;
    this.currentKey = key;
    this.disposeInstances(this.improvements);
    this.improvements.clear();
    for (const bus of this.busGroups) {
      this.scene.remove(bus);
      this.disposeInstances(bus);
    }
    this.busGroups = [];
    this.cars = this.cars.filter((c) => !c.bus);
    for (const item of visualPlan(selection)) {
      const d = item.location;
      const b = new Batches(this);
      const x = d.x;
      const z = d.z;
      if (item.category === "greenery") {
        if (item.id === "g1")
          for (const dx of [-12, -6, 6, 12])
            for (const dz of [-10, 2, 10])
              b.tree(x + dx + 1.7, z + dz, 0.85, "#479467");
        if (item.id === "g2") {
          b.box(x - 5.7, 0.14, z + 6.4, 6.5, 0.2, 6.3, "#90b986");
          b.box(x - 5.7, 0.26, z + 6.4, 1, 0.05, 6.2, "#eadcba");
          b.box(x - 5.7, 0.27, z + 6.4, 6.3, 0.05, 0.8, "#eadcba");
          for (const dx of [-8, -3.5])
            for (const dz of [4.2, 8.4]) b.tree(x + dx, z + dz, 1, "#478c5d");
          b.shape(
            "cylinder",
            x - 5.7,
            0.5,
            z + 6.4,
            1.05,
            0.4,
            1.05,
            "#dce7dd",
          );
          b.shape(
            "cylinder",
            x - 5.7,
            0.74,
            z + 6.4,
            0.78,
            0.08,
            0.78,
            "#65b9d2",
          );
        }
        if (item.id === "g3")
          for (let n = 0; n < 14; n++) {
            b.tree(x - 14 + n * 2.15, z + 11, 1, "#418963");
            b.tree(x - 14 + n * 2.15, z - 11, 0.85, "#5b9b68");
          }
      }
      if (item.category === "transport") {
        if (item.id === "t1")
          for (const dx of [-2.1, 2.1])
            for (const dz of [-3, 1]) {
              b.box(x + dx, 1.2, z + dz, 0.13, 2.4, 0.13, "#43596a");
              b.box(x + dx, 2.45, z + dz, 0.45, 0.85, 0.28, "#334756");
              for (let k = 0; k < 3; k++)
                b.shape(
                  "leaf",
                  x + dx,
                  2.18 + k * 0.24,
                  z + dz + 0.17,
                  0.12,
                  0.12,
                  0.07,
                  k === 0 ? "#7bde88" : "#694e4e",
                );
            }
        if (item.id === "t3") {
          b.box(x + 0.9, 0.16, z, 0.62, 0.04, 23, "#548fd8");
          for (const dz of [-7, 7]) {
            b.box(x + 2.4, 0.6, z + dz, 0.15, 1.2, 2.2, "#a4c8de");
            b.box(x + 2.8, 1.35, z + dz, 1.2, 0.16, 2.4, "#3874be");
          }
        }
        if (item.id === "t2" || item.id === "t3") {
          const bus = this.vehicle("#3159db", true);
          this.scene.add(bus);
          this.busGroups.push(bus);
          this.cars.push({ group: bus, x, z, phase: 0.35, bus: true });
        }
      }
      if (item.category === "social") {
        if (item.id === "s1") {
          b.box(x + 5.8, 0.2, z + 6, 5, 0.2, 4, "#c99e72");
          b.box(x + 4, 0.38, z + 5, 1.7, 0.45, 1.2, "#6ca4c8", false, 0.12);
          b.box(x + 7, 0.65, z + 6, 1.8, 0.22, 0.6, "#ddb368");
          for (const dx of [3.6, 8])
            b.box(x + dx, 0.5, z + 8, 1.2, 0.25, 0.5, "#768ca1");
        } else {
          const hospital = item.id === "s3";
          b.box(
            x + 5.7,
            1.5,
            z + 6,
            5.5,
            3,
            4.7,
            hospital ? "#f0ece3" : "#c7b5d5",
            true,
          );
          b.box(
            x + 5.7,
            3.1,
            z + 6,
            5.8,
            0.2,
            5,
            hospital ? "#58a8bd" : "#9c7bbc",
          );
          b.box(x + 5.7, 0.8, z + 8.5, 1.3, 1.6, 0.2, "#658fb6");
          if (hospital) {
            b.box(x + 5.7, 2.4, z + 8.45, 1.1, 0.27, 0.12, "#d56369");
            b.box(x + 5.7, 2.4, z + 8.46, 0.27, 1.1, 0.13, "#d56369");
          } else {
            b.box(x + 3.5, 1.7, z + 8.5, 0.25, 3, 0.25, "#ddd7a7");
            b.box(x + 3.85, 2.8, z + 8.5, 0.7, 0.45, 0.1, "#42a8c8");
          }
        }
      }
      if (item.category === "safety") {
        if (item.id === "b1" || item.id === "b3")
          for (let n = -10; n <= 10; n += 4) b.lamp(x + 2.2, z + n);
        if (item.id === "b2" || item.id === "b3") {
          for (let n = 0; n < 7; n++)
            b.box(x - 1.3 + n * 0.43, 0.175, z - 6, 0.21, 0.02, 1.8, "#f8f2d9");
          for (const dx of [-2.1, 2.1]) {
            b.box(x + dx, 0.9, z - 6, 0.1, 1.8, 0.1, "#647a8a");
            b.box(x + dx, 1.7, z - 6, 0.6, 0.65, 0.12, "#3970c1");
          }
          b.box(x + 2.7, 0.55, z - 6, 0.15, 0.8, 4, "#e1c172");
        }
        if (item.id === "b3") {
          b.box(x - 3, 1, z + 9, 2, 2, 2, "#c6d8e4");
          b.box(x - 3, 2.1, z + 9, 2.2, 0.2, 2.2, "#546ca4");
        }
      }
      if (item.category === "service") {
        if (item.id === "c1")
          for (const dx of [-12, 12])
            for (let n = 0; n < 3; n++) {
              b.box(
                x + dx + n * 0.65,
                0.5,
                z + 1.8,
                0.52,
                0.8,
                0.65,
                ["#408cb4", "#e3b850", "#62a478"][n],
              );
              b.box(
                x + dx + n * 0.65,
                0.94,
                z + 1.8,
                0.56,
                0.12,
                0.7,
                "#d5dfe4",
              );
            }
        if (item.id === "c2") {
          b.box(x - 6, 1, z + 9, 3.3, 1.8, 1.8, "#a2c9dc", true);
          b.box(x - 6, 2, z + 9, 3.5, 0.18, 2, "#397db8");
          b.box(x - 6, 1.5, z + 10, 0.9, 0.4, 0.1, "#3c73da");
        }
        if (item.id === "c3") {
          b.box(x - 6, 1, z + 9, 3, 2, 2, "#a8c2d1", true);
          b.shape("cylinder", x - 6, 3, z + 9, 0.08, 2, 0.08, "#647889");
          b.shape("leaf", x - 6, 4, z + 9, 0.45, 0.18, 0.45, "#75c7d5");
          for (const dx of [-2, 2]) {
            b.box(x + dx, 1.5, z - 2, 0.08, 3, 0.08, "#6b859b");
            b.box(x + dx, 3, z - 2, 0.35, 0.2, 0.5, "#498fac");
          }
          b.box(x - 9, 0.5, z + 9, 0.9, 0.7, 1.5, "#e1b765");
        }
      }
      const group = b.build();
      group.userData.initiativeId = item.id;
      group.scale.y = this.motion ? 0.01 : 1;
      this.improvements.add(group);
    }
    this.improvements.visible = !this.before;
    for (const bus of this.busGroups) bus.visible = !this.before;
  }
  setBefore(value: boolean) {
    this.before = value;
    this.improvements.visible = !value;
    for (const bus of this.busGroups) bus.visible = !value;
  }
  setMotion(value: boolean) {
    this.motion = value;
    if (!value)
      this.improvements.children.forEach((g) => {
        g.scale.y = 1;
      });
  }
  setNight(value: boolean) {
    this.night = value;
    const background = value ? "#172a48" : "#e8eff7";
    this.scene.background = new THREE.Color(background);
    (this.scene.fog as THREE.Fog).color.set(background);
    this.hemisphere.intensity = value ? 0.8 : 2.4;
    this.sun.intensity = value ? 0.3 : 3;
    for (const material of this.materials.values()) {
      material.emissive.set(value && material.map ? "#a38a55" : "#000000");
      material.emissiveIntensity = value ? 0.2 : 0;
    }
  }
  focus(id: string, move = true) {
    const d = districtLayout.find((d) => d.id === id);
    if (!d) return;
    this.selected = id;
    if (this.ring) this.ring.position.set(d.x, 0, d.z);
    if (move) {
      const offset = this.camera.position
        .clone()
        .sub(this.controls.target)
        .normalize()
        .multiplyScalar(63);
      this.controls.target.set(d.x, 0, d.z);
      this.camera.position.copy(this.controls.target).add(offset);
      this.controls.update();
    }
  }
  reset() {
    this.controls.reset();
    this.resize();
  }
  zoom(inward: boolean) {
    if (inward) this.controls.dollyIn(1.18);
    else this.controls.dollyOut(1.18);
    this.controls.update();
  }
  rotate(direction: number) {
    this.controls.rotateLeft((direction * Math.PI) / 8);
    this.controls.update();
  }
  getInfo() {
    return {
      district: this.selected,
      visibleInitiatives: this.before ? 0 : this.improvements.children.length,
      drawCalls: this.renderer.info.render.calls,
    };
  }
  private resize() {
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = THREE.MathUtils.radToDeg(
      2 *
        Math.atan(
          Math.tan(THREE.MathUtils.degToRad(20)) /
            Math.min(1, this.camera.aspect / 1.45),
        ),
    );
    this.camera.updateProjectionMatrix();
  }
  private pointerDown = (event: PointerEvent) => {
    this.down = { x: event.clientX, y: event.clientY };
  };
  private pointerUp = (event: PointerEvent) => {
    if (
      Math.hypot(event.clientX - this.down.x, event.clientY - this.down.y) > 6
    )
      return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.districts);
    if (hits[0]) this.onSelect(hits[0].object.userData.districtId);
  };
  private contextLost = (event: Event) => {
    event.preventDefault();
    this.onLost();
  };
  private tick = (now: number) => {
    if (!this.alive) return;
    this.frame = requestAnimationFrame(this.tick);
    const delta = Math.min((now - this.previous) / 1000, 0.05);
    if (now - this.previous < 32) return;
    this.previous = now;
    if (document.hidden || !this.visible) return;
    this.controls.update(delta);
    if (this.motion) {
      this.elapsed += delta;
      this.improvements.children.forEach((g) => {
        g.scale.y = THREE.MathUtils.lerp(g.scale.y, 1, 0.12);
      });
    }
    for (const car of this.cars) {
      const p = (this.elapsed * (car.bus ? 0.04 : 0.055) + car.phase) % 1;
      const side = Math.floor(p * 4);
      const t = (p * 4) % 1;
      const positions = [
        [-0.72, -10 + t * 20],
        [-0.72 + t * 10.44, 10],
        [9.72, 10 - t * 20],
        [9.72 - t * 10.44, -10],
      ];
      car.group.position.set(
        car.x + positions[side][0],
        0.15,
        car.z + positions[side][1],
      );
      car.group.rotation.y = [0, Math.PI / 2, Math.PI, Math.PI * 1.5][side];
    }
    this.renderer.render(this.scene, this.camera);
  };
  private disposeInstances(root: THREE.Object3D) {
    root.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
  }
  dispose() {
    this.alive = false;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.intersection.disconnect();
    this.controls.dispose();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener("pointerdown", this.pointerDown);
    canvas.removeEventListener("pointerup", this.pointerUp);
    canvas.removeEventListener("webglcontextlost", this.contextLost);
    this.disposeInstances(this.scene);
    Object.values(this.geometries).forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.facadeTexture.dispose();
    this.districts.forEach((d) => {
      d.geometry.dispose();
      (d.material as THREE.Material).dispose();
    });
    this.labels.forEach((label) => {
      label.material.map?.dispose();
      label.material.dispose();
    });
    this.ring.geometry.dispose();
    (this.ring.material as THREE.Material).dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    canvas.remove();
  }
}
