// Cảnh lái xe 3D vô tận với đường tái sử dụng (Object Pooling), biển báo 3D và xe của bé
import * as THREE from 'three';
import type { TrafficSignQuestion, VehicleId } from '../data';
import {
  createCloudMesh,
  createConeTreeMesh,
  createFlowerBushMesh,
  createHouseMesh,
  createRoundTreeMesh,
  createTrafficSign3D,
  createVehicleMesh,
} from '../models3d';
import {
  applyStudioEnvironment,
  createStudioRenderer,
  disposeObject3D,
  scheduleAfterSoftwareDraw,
} from './webglDetect';

export interface DrivingSceneCallbacks {
  onReachSign?: () => void;
}

const SEGMENT_LENGTH = 16;
const SEGMENT_COUNT = 10;
const TOTAL_ROAD_LENGTH = SEGMENT_LENGTH * SEGMENT_COUNT;
const SIGN_STOP_Z = -8.5;
const SIGN_SPAWN_Z = -105;

function createSkyGradientTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#38BDF8');
  grad.addColorStop(0.55, '#7DD3FC');
  grad.addColorStop(0.88, '#CBEAFE');
  grad.addColorStop(1, '#E0F2FE');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class DrivingScene3D {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private isSoftwareGl: boolean;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envTexture: THREE.Texture;

  private segments: THREE.Group[] = [];
  private clouds: THREE.Group[] = [];
  private carGroup: THREE.Group;
  private activeSignGroup: THREE.Group | null = null;

  private currentVehicleId: VehicleId;
  private callbacks: DrivingSceneCallbacks;

  private frameId = 0;
  private disposed = false;
  private paused = false;
  private lastTime = performance.now();

  // Trạng thái chuyển động
  private cruiseMode = false;
  private drivingState: 'cruise' | 'approaching' | 'stopped' | 'boosting' = 'cruise';
  private currentSpeed = 16;
  private targetSpeed = 16;
  private boostTimer = 0;
  private wobbleTimer = 0;
  private wheelAngle = 0;
  private elapsed = 0;
  private reducedMotion = false;

  // Camera damping
  private camZ = 7.4;
  private camY = 3.7;

  // Bound listeners
  private onResizeBound: () => void;
  private onVisibilityBound: () => void;

  constructor(
    container: HTMLElement,
    vehicleId: VehicleId,
    callbacks: DrivingSceneCallbacks = {}
  ) {
    this.container = container;
    this.currentVehicleId = vehicleId;
    this.callbacks = callbacks;
    this.reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const { renderer, isSoftwareGl } = createStudioRenderer(container);
    this.renderer = renderer;
    this.isSoftwareGl = isSoftwareGl;

    this.scene = new THREE.Scene();
    const skyTex = createSkyGradientTexture();
    this.scene.background = skyTex;
    this.scene.fog = new THREE.Fog(0xcbeafe, 62, 152);

    this.envTexture = applyStudioEnvironment(this.renderer, this.scene);

    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    this.camera = new THREE.PerspectiveCamera(52, w / h, 0.5, 220);
    this.camera.position.set(0, this.camY, this.camZ);
    this.camera.lookAt(0, 1.35, -14);

    this.setupLights();
    this.buildSkyProps();
    this.buildPooledRoadSegments();

    this.carGroup = createVehicleMesh(vehicleId);
    this.carGroup.position.set(0, 0, 0);
    this.scene.add(this.carGroup);

    if (!isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.onResizeBound = () => this.handleResize();
    this.onVisibilityBound = () => this.handleVisibility();
    window.addEventListener('resize', this.onResizeBound);
    document.addEventListener('visibilitychange', this.onVisibilityBound);

    this.lastTime = performance.now();
    this.startLoop();
  }

  private setupLights(): void {
    // Ánh sáng cân bằng giữa trời xanh và mặt đất để giữ màu sắc rực rỡ, có chiều sâu
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x34b856, 0.56);
    this.scene.add(hemi);

    const sunLight = new THREE.DirectionalLight(0xfffdf5, 1.02);
    sunLight.position.set(16, 26, 12);
    if (!this.isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(1024, 1024);
      sunLight.shadow.camera.near = 2;
      sunLight.shadow.camera.far = 75;
      const d = 24;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0005;
      sunLight.shadow.normalBias = 0.02;
    }
    this.scene.add(sunLight);
  }

  private buildSkyProps(): void {
    // Mặt trời rực rỡ phía chân trời
    const sunGeo = new THREE.SphereGeometry(5.5, 18, 18);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd93d, fog: false });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(-28, 30, -118);
    this.scene.add(sun);

    // Các đám mây trôi nhẹ
    const cloudCoords: Array<[number, number, number, number]> = [
      [-18, 18, -55, 1.5],
      [20, 21, -80, 1.8],
      [-8, 24, -105, 1.6],
      [14, 17, -42, 1.2],
      [0, 22, -70, 1.35],
    ];
    cloudCoords.forEach(([x, y, z, s]) => {
      const cloud = createCloudMesh();
      cloud.position.set(x, y, z);
      cloud.scale.setScalar(s);
      cloud.userData.driftSpeed = 0.55 + Math.random() * 0.45;
      this.scene.add(cloud);
      this.clouds.push(cloud);
    });
  }

  private buildPooledRoadSegments(): void {
    // Vật liệu dùng chung với độ bão hòa cao, tương phản rõ cho trẻ em
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x34b856, roughness: 0.94 });
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x273244, roughness: 0.88 });
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.86 });
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.55,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const curbRedMat = new THREE.MeshStandardMaterial({ color: 0xef233c, roughness: 0.72 });
    const curbWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.72 });

    const grassGeo = new THREE.PlaneGeometry(110, SEGMENT_LENGTH + 0.1);
    grassGeo.rotateX(-Math.PI / 2);

    const roadGeo = new THREE.PlaneGeometry(8.4, SEGMENT_LENGTH + 0.08);
    roadGeo.rotateX(-Math.PI / 2);

    const sidewalkGeo = new THREE.BoxGeometry(2.2, 0.16, SEGMENT_LENGTH + 0.06);
    const dashGeo = new THREE.PlaneGeometry(0.32, 3.2);
    dashGeo.rotateX(-Math.PI / 2);
    const curbGeo = new THREE.BoxGeometry(0.36, 0.2, SEGMENT_LENGTH / 4);

    const flowerColors = [0xff5a5f, 0xffd93d, 0xa78bfa, 0xff8a3d];

    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const seg = new THREE.Group();
      const zPos = 16 - i * SEGMENT_LENGTH;
      seg.position.set(0, 0, zPos);

      // Cỏ xanh hai bên kéo rộng ra chân trời
      const grass = new THREE.Mesh(grassGeo, grassMat);
      grass.position.y = -0.02;
      grass.receiveShadow = true;
      seg.add(grass);

      // Mặt đường nhựa
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.position.y = 0.01;
      road.receiveShadow = true;
      seg.add(road);

      // Vỉa hè hai bên
      [-5.3, 5.3].forEach((sx) => {
        const sw = new THREE.Mesh(sidewalkGeo, sidewalkMat);
        sw.position.set(sx, 0.07, 0);
        sw.receiveShadow = true;
        seg.add(sw);
      });

      // Vạch kẻ vàng đứt ở giữa đường
      [-4, 4].forEach((dz) => {
        const dash = new THREE.Mesh(dashGeo, lineMat);
        dash.position.set(0, 0.025, dz);
        seg.add(dash);
      });

      // Lề đường sơn đỏ-trắng xen kẽ
      for (let c = 0; c < 4; c++) {
        const cz = -SEGMENT_LENGTH / 2 + (c + 0.5) * (SEGMENT_LENGTH / 4);
        const cMat = c % 2 === 0 ? curbRedMat : curbWhiteMat;
        [-4.25, 4.25].forEach((cx) => {
          const curb = new THREE.Mesh(curbGeo, cMat);
          curb.position.set(cx, 0.1, cz);
          curb.receiveShadow = true;
          seg.add(curb);
        });
      }

      // Cây xanh, nhà nhiều màu & bụi hoa hai bên lề
      const leftTree = i % 2 === 0 ? createRoundTreeMesh(1.05) : createConeTreeMesh(1.1);
      leftTree.position.set(-7.6, 0, -3.5);
      seg.add(leftTree);

      const rightTree = i % 2 === 0 ? createConeTreeMesh(1.0) : createRoundTreeMesh(1.05);
      rightTree.position.set(7.6, 0, 4.0);
      seg.add(rightTree);

      const flowerL = createFlowerBushMesh(flowerColors[i % flowerColors.length]);
      flowerL.position.set(-7.2, 0, 3.8);
      const flowerR = createFlowerBushMesh(flowerColors[(i + 2) % flowerColors.length]);
      flowerR.position.set(7.2, 0, -4.2);
      seg.add(flowerL, flowerR);

      // Nhà low-poly lùi vào trong thảm cỏ
      const houseL = createHouseMesh(i, 1.12);
      houseL.position.set(-12.2, 0, 0);
      houseL.rotation.y = Math.PI / 2;
      seg.add(houseL);

      const houseR = createHouseMesh(i + 2, 1.08);
      houseR.position.set(12.2, 0, -1.5);
      houseR.rotation.y = -Math.PI / 2;
      seg.add(houseR);

      this.scene.add(seg);
      this.segments.push(seg);
    }
  }

  public setVehicle(vehicleId: VehicleId): void {
    if (this.currentVehicleId === vehicleId) return;
    this.currentVehicleId = vehicleId;
    this.scene.remove(this.carGroup);
    disposeObject3D(this.carGroup);
    this.carGroup = createVehicleMesh(vehicleId);
    this.carGroup.position.set(0, 0, 0);
    this.scene.add(this.carGroup);
  }

  public setCruiseMode(enabled: boolean): void {
    this.cruiseMode = enabled;
    if (enabled) {
      this.drivingState = 'cruise';
      this.targetSpeed = 13;
      this.clearActiveSign();
    }
  }

  public clearActiveSign(): void {
    if (this.activeSignGroup) {
      this.scene.remove(this.activeSignGroup);
      disposeObject3D(this.activeSignGroup);
      this.activeSignGroup = null;
    }
  }

  // Cho biển báo 3D xuất hiện ở phía xa bên lề phải và xe chạy tới
  public spawnNextSign(sign: TrafficSignQuestion): void {
    this.clearActiveSign();
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const signGroup = createTrafficSign3D(sign, Math.min(maxAniso, 8));
    signGroup.position.set(4.35, 0, SIGN_SPAWN_Z);
    signGroup.rotation.y = -0.24; // Hơi xoay mặt về phía xe & camera cho dễ đọc
    this.scene.add(signGroup);
    this.activeSignGroup = signGroup;
    this.cruiseMode = false;
    this.drivingState = 'approaching';
    this.targetSpeed = 20;
  }

  // Tăng tốc phấn khởi sau khi trả lời đúng
  public triggerCorrectBoost(): void {
    this.drivingState = 'boosting';
    this.boostTimer = 1.25;
    this.targetSpeed = 34;
    // Cho biển báo vừa qua trôi nhanh khỏi màn hình
  }

  // Rung nhẹ thân thiện khi trả lời chưa đúng
  public triggerWrongWobble(): void {
    this.wobbleTimer = 0.55;
  }

  private handleResize(): void {
    if (this.disposed) return;
    const w = Math.max(this.container.clientWidth, 1);
    const h = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = w / h;
    // Điều chỉnh FOV nhẹ khi màn hình dọc hẹp để giữ trọn mặt đường & biển báo
    this.camera.fov = w < h ? 62 : 52;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private handleVisibility(): void {
    if (document.hidden) {
      this.paused = true;
    } else {
      this.paused = false;
      this.lastTime = performance.now();
    }
  }

  private startLoop(): void {
    this.handleResize();
    const tick = () => {
      if (this.disposed) return;

      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = this.paused ? 0 : Math.min(Math.max(rawDt, 0), 0.05);

      if (!this.paused) {
        this.update(dt);
        this.renderer.render(this.scene, this.camera);
      }

      if (this.isSoftwareGl) {
        scheduleAfterSoftwareDraw(this.renderer, tick, (id) => {
          this.frameId = id;
        });
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.renderer.render(this.scene, this.camera);
      scheduleAfterSoftwareDraw(this.renderer, tick, (id) => {
        this.frameId = id;
      });
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private update(dt: number): void {
    this.elapsed += dt;

    // 1. Điều khiển tốc độ & trạng thái dừng trước biển báo
    if (this.drivingState === 'boosting') {
      this.boostTimer -= dt;
      if (this.boostTimer <= 0) {
        this.drivingState = 'cruise';
        this.targetSpeed = 18;
      }
    } else if (this.drivingState === 'approaching' && this.activeSignGroup) {
      const dist = Math.abs(this.activeSignGroup.position.z - SIGN_STOP_Z);
      if (dist < 18) {
        // Giảm tốc mượt khi tiến gần biển báo
        this.targetSpeed = Math.max(4.5, (dist / 18) * 18);
      }
    } else if (this.drivingState === 'stopped') {
      this.targetSpeed = 0;
    }

    this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, this.targetSpeed, 6.5, dt);
    const moveZ = this.currentSpeed * dt;

    // 2. Tái sử dụng các đoạn đường (infinite loop)
    if (moveZ > 0.0001) {
      for (let i = 0; i < this.segments.length; i++) {
        const seg = this.segments[i];
        seg.position.z += moveZ;
        if (seg.position.z > 24) {
          seg.position.z -= TOTAL_ROAD_LENGTH;
        }
      }
    }

    // 3. Di chuyển biển báo 3D tiến về phía xe
    if (this.activeSignGroup && moveZ > 0.0001) {
      this.activeSignGroup.position.z += moveZ;

      if (
        this.drivingState === 'approaching' &&
        this.activeSignGroup.position.z >= SIGN_STOP_Z
      ) {
        this.activeSignGroup.position.z = SIGN_STOP_Z;
        this.drivingState = 'stopped';
        this.currentSpeed = 0;
        this.targetSpeed = 0;
        this.callbacks.onReachSign?.();
      } else if (this.activeSignGroup.position.z > 16) {
        this.clearActiveSign();
      }
    }

    // 4. Đám mây trôi ngang nhẹ nhàng
    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      c.position.x += (c.userData.driftSpeed as number) * dt;
      if (c.position.x > 36) c.position.x = -36;
    }

    // 5. Hoạt ảnh xe (quay bánh, rung nhẹ thân xe, đèn cảnh sát)
    const wheels = this.carGroup.userData.wheels as THREE.Group[] | undefined;
    if (wheels && moveZ > 0) {
      this.wheelAngle -= moveZ / 0.32;
      for (let i = 0; i < wheels.length; i++) {
        wheels[i].rotation.x = this.wheelAngle;
      }
    }

    const bodyRoot = this.carGroup.userData.bodyRoot as THREE.Group | undefined;
    if (bodyRoot) {
      const motionScale = this.reducedMotion ? 0.15 : 1;
      const runBob =
        this.currentSpeed > 0.5
          ? Math.sin(this.elapsed * (8 + this.currentSpeed * 0.25)) * 0.032 * motionScale
          : Math.sin(this.elapsed * 2.5) * 0.01 * motionScale;

      let wobbleZ = 0;
      if (this.wobbleTimer > 0) {
        this.wobbleTimer = Math.max(0, this.wobbleTimer - dt);
        wobbleZ = Math.sin(this.elapsed * 28) * 0.075 * (this.wobbleTimer / 0.55) * motionScale;
      }

      const speedTiltX =
        this.drivingState === 'boosting' ? 0.035 * motionScale : 0;

      bodyRoot.position.y = THREE.MathUtils.damp(bodyRoot.position.y, runBob, 12, dt);
      bodyRoot.rotation.z = THREE.MathUtils.damp(bodyRoot.rotation.z, wobbleZ, 16, dt);
      bodyRoot.rotation.x = THREE.MathUtils.damp(bodyRoot.rotation.x, speedTiltX, 8, dt);
    }

    // Nhấp nháy đèn cảnh sát nhẹ nhàng
    const pRed = this.carGroup.userData.policeRed as THREE.MeshStandardMaterial | undefined;
    const pBlue = this.carGroup.userData.policeBlue as THREE.MeshStandardMaterial | undefined;
    if (pRed && pBlue) {
      const blink = Math.sin(this.elapsed * 10) > 0;
      pRed.emissiveIntensity = blink ? 1.4 : 0.2;
      pBlue.emissiveIntensity = blink ? 0.2 : 1.4;
    }

    // 6. Camera lùi nhẹ khi tăng tốc & giữ trọn đuôi xe + biển báo khi dừng
    const targetCamZ =
      this.cruiseMode
        ? 8.0
        : this.drivingState === 'boosting'
          ? 8.9
          : this.drivingState === 'stopped'
            ? 7.75
            : 7.5;
    const targetCamY = this.cruiseMode ? 4.1 : this.drivingState === 'stopped' ? 3.8 : 3.7;
    const targetCamX = this.drivingState === 'stopped' ? 0.85 : 0;

    this.camZ = THREE.MathUtils.damp(this.camZ, targetCamZ, 4.5, dt);
    this.camY = THREE.MathUtils.damp(this.camY, targetCamY, 4.5, dt);
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 4.5, dt);
    this.camera.position.y = this.camY;
    this.camera.position.z = this.camZ;
    this.camera.lookAt(
      this.drivingState === 'stopped' ? 1.45 : 0,
      this.drivingState === 'stopped' ? 0.95 : 1.4,
      this.drivingState === 'stopped' ? -8.5 : -14
    );
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResizeBound);
    document.removeEventListener('visibilitychange', this.onVisibilityBound);

    this.clearActiveSign();
    disposeObject3D(this.scene);
    this.envTexture.dispose();
    if (this.scene.background instanceof THREE.Texture) {
      this.scene.background.dispose();
    }
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
