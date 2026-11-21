// Cảnh bản đồ ngã rẽ 3D góc nhìn isometric (trái -> phải): Nhà An -> 3 con đường (2 chặng km) -> Điểm đến
import * as THREE from 'three';
import type { DestinationId, JunctionRoute, JunctionRouteId, VehicleId } from '../data';
import {
  createAnHouse3D,
  createBridgeAndRoadwork3D,
  createCloudMesh,
  createConeTreeMesh,
  createDestinationBuilding3D,
  createFerrisWheelAndSlide3D,
  createFlowerBushMesh,
  createRoundTreeMesh,
  createShop3D,
  createTrafficLightPole3D,
  createVehicleMesh,
} from '../models3d';
import {
  applyStudioEnvironment,
  createStudioRenderer,
  disposeObject3D,
  scheduleAfterSoftwareDraw,
} from './webglDetect';

export interface ProjectedPoint {
  x: number;
  y: number;
  visible: boolean;
}

export interface ProjectedRouteLabel {
  id: JunctionRouteId;
  seg1: ProjectedPoint;
  seg2: ProjectedPoint;
}

export interface ProjectedMapAnchors {
  routes: ProjectedRouteLabel[];
  start: ProjectedPoint;
  shop: ProjectedPoint;
  destination: ProjectedPoint;
}

interface RoadBranch {
  route: JunctionRoute;
  curve: THREE.CatmullRomCurve3;
  roadMesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  hitMesh: THREE.Mesh;
  seg1WorldPos: THREE.Vector3;
  seg2WorldPos: THREE.Vector3;
  highlighted: boolean;
}

export class JunctionScene3D {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private isSoftwareGl: boolean;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envTex: THREE.Texture;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private branches: RoadBranch[] = [];
  private hitMeshes: THREE.Object3D[] = [];
  private carGroup: THREE.Group;
  private ferrisWheelRoot: THREE.Group | null = null;
  private clouds: THREE.Group[] = [];

  private startLabelWorldPos = new THREE.Vector3(-8.4, 2.25, -1.6);
  private shopLabelWorldPos = new THREE.Vector3(0.1, 2.1, -0.45);
  private destLabelWorldPos = new THREE.Vector3(7.9, 2.9, -0.1);

  private onSelectRoute: (route: JunctionRoute) => void;
  private onProjectAnchors: (anchors: ProjectedMapAnchors) => void;

  // Hoạt ảnh xe chạy trên con đường đã chọn
  private drivingBranch: RoadBranch | null = null;
  private driveProgress = 0;
  private onDriveComplete: (() => void) | null = null;
  private wheelAngle = 0;

  private frameId = 0;
  private disposed = false;
  private paused = false;
  private lastTime = performance.now();
  private elapsed = 0;
  private _projVec = new THREE.Vector3();
  private _posVec = new THREE.Vector3();
  private _tanVec = new THREE.Vector3();

  private onResizeBound: () => void;
  private onPointerDownBound: (e: PointerEvent) => void;
  private onPointerMoveBound: (e: PointerEvent) => void;
  private onVisibilityBound: () => void;

  constructor(
    container: HTMLElement,
    vehicleId: VehicleId,
    destinationId: DestinationId,
    routes: JunctionRoute[],
    onSelectRoute: (route: JunctionRoute) => void,
    onProjectAnchors: (anchors: ProjectedMapAnchors) => void
  ) {
    this.container = container;
    this.onSelectRoute = onSelectRoute;
    this.onProjectAnchors = onProjectAnchors;

    const { renderer, isSoftwareGl } = createStudioRenderer(container);
    this.renderer = renderer;
    this.isSoftwareGl = isSoftwareGl;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9bd7ff);
    this.scene.fog = new THREE.Fog(0x9bd7ff, 46, 98);
    this.envTex = applyStudioEnvironment(this.renderer, this.scene);

    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.5, 160);
    this.camera.position.set(0.3, 18.5, 16.5);
    this.camera.lookAt(0.3, 0.4, 0.4);

    this.setupLights();
    this.buildTerrainAndLandmarks(destinationId);
    this.buildThreeBranches(routes);

    // Xe đang đỗ trước cửa Nhà An hướng sang phải (+X)
    this.carGroup = createVehicleMesh(vehicleId);
    this.carGroup.scale.setScalar(0.68);
    this.carGroup.position.set(-6.9, 0.05, 0);
    this.carGroup.rotation.y = -Math.PI / 2;
    this.scene.add(this.carGroup);

    if (!isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.onResizeBound = () => this.handleResize();
    this.onPointerDownBound = (e) => this.handlePointerDown(e);
    this.onPointerMoveBound = (e) => this.handlePointerMove(e);
    this.onVisibilityBound = () => {
      this.paused = document.hidden;
      if (!this.paused) this.lastTime = performance.now();
    };

    window.addEventListener('resize', this.onResizeBound);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDownBound);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMoveBound);
    document.addEventListener('visibilitychange', this.onVisibilityBound);

    this.handleResize();
    this.startLoop();
  }

  private setupLights(): void {
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x34b856, 0.58);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfffdf5, 1.02);
    sun.position.set(14, 24, 14);
    if (!this.isSoftwareGl) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      const d = 19;
      sun.shadow.camera.left = -d;
      sun.shadow.camera.right = d;
      sun.shadow.camera.top = d;
      sun.shadow.camera.bottom = -d;
      sun.shadow.bias = -0.0005;
    }
    this.scene.add(sun);
  }

  private buildTerrainAndLandmarks(destinationId: DestinationId): void {
    // Nền cỏ xanh tươi rực rỡ
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(130, 110),
      new THREE.MeshStandardMaterial({ color: 0x34b856, roughness: 0.92 })
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.04;
    grass.receiveShadow = true;
    this.scene.add(grass);

    // Dòng sông xanh uốn lượn ở phía dưới bản đồ (Đường thứ ba bắc cầu qua)
    const riverCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-15, 0.01, 6.9),
      new THREE.Vector3(-6.2, 0.01, 6.2),
      new THREE.Vector3(-1.6, 0.01, 4.9),
      new THREE.Vector3(2.8, 0.01, 6.4),
      new THREE.Vector3(15, 0.01, 5.7),
    ]);
    const riverGeo = new THREE.TubeGeometry(riverCurve, 44, 1.05, 8, false);
    riverGeo.scale(1, 0.06, 1);
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.2,
      metalness: 0.1,
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.receiveShadow = true;
    this.scene.add(river);

    // Bờ cát vàng nhẹ dọc sông
    const bankGeo = new THREE.TubeGeometry(riverCurve, 44, 1.24, 8, false);
    bankGeo.scale(1, 0.04, 1);
    const bank = new THREE.Mesh(
      bankGeo,
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 })
    );
    bank.position.y = -0.02;
    this.scene.add(bank);

    // Nhà An ở bên trái
    const anHouse = createAnHouse3D();
    anHouse.position.set(-8.4, 0, -2.0);
    anHouse.scale.setScalar(0.86);
    this.scene.add(anHouse);

    // Cửa hàng ở giữa (cạnh Đường thứ hai)
    const shop = createShop3D();
    shop.position.set(0.1, 0, -0.55);
    shop.scale.setScalar(0.8);
    this.scene.add(shop);

    // Trụ đèn giao thông ở ngã tư phía trên (cạnh Đường thứ nhất)
    const trafficPole = createTrafficLightPole3D();
    trafficPole.position.set(0.2, 0, -5.05);
    trafficPole.scale.setScalar(0.85);
    this.scene.add(trafficPole);

    // Cây cầu bắc qua sông & Rào chắn + Biển báo đường đang sửa chữa trên Đường thứ ba
    const { bridge, roadwork } = createBridgeAndRoadwork3D();
    bridge.position.set(-1.6, 0, 4.55);
    bridge.scale.setScalar(0.86);
    this.scene.add(bridge);

    roadwork.position.set(1.65, 0.06, 4.65);
    roadwork.scale.setScalar(0.88);
    this.scene.add(roadwork);

    // Điểm đến ở bên phải
    const destBuilding = createDestinationBuilding3D(destinationId);
    destBuilding.position.set(7.9, 0, -0.4);
    destBuilding.scale.setScalar(1.0);
    destBuilding.rotation.y = -0.25;
    this.scene.add(destBuilding);

    // Nếu là Công viên Thiếu nhi, thêm Vòng đu quay & Cầu trượt giống hình minh họa
    if (destinationId === 'park') {
      const playground = createFerrisWheelAndSlide3D();
      playground.position.set(10.1, 0, -2.6);
      playground.scale.setScalar(0.88);
      playground.rotation.y = -0.22;
      this.scene.add(playground);
      this.ferrisWheelRoot = playground;
    }

    // Cây cối, bụi hoa và mây trang trí
    const decorTrees: Array<[number, number, boolean, number]> = [
      [-10.2, -4.6, true, 1.05],
      [-6.5, -5.2, false, 0.9],
      [-9.8, 3.2, true, 0.95],
      [-5.6, 2.2, false, 0.78],
      [-3.5, -1.7, true, 0.72],
      [3.6, -1.8, false, 0.75],
      [5.4, -5.0, true, 0.95],
      [5.2, 4.9, true, 0.88],
      [9.4, 2.8, false, 0.92],
      [11.2, 5.2, true, 1.0],
    ];
    decorTrees.forEach(([x, z, round, s]) => {
      const t = round ? createRoundTreeMesh(s) : createConeTreeMesh(s);
      t.position.set(x, 0, z);
      this.scene.add(t);
    });

    const flowerSpots: Array<[number, number, number]> = [
      [-7.2, 2.6, 0xf43f5e],
      [-2.2, -2.3, 0xfacc15],
      [2.6, 2.1, 0xec4899],
      [6.4, 1.9, 0xf97316],
      [8.3, 2.1, 0xa855f7],
      [-4.2, 7.6, 0xfacc15],
    ];
    flowerSpots.forEach(([x, z, color]) => {
      const bush = createFlowerBushMesh(color);
      bush.position.set(x, 0, z);
      this.scene.add(bush);
    });

    const cloudPositions: Array<[number, number, number]> = [
      [-7.5, 8.5, -9.5],
      [1.0, 9.2, -10.5],
      [8.2, 8.8, -9.0],
    ];
    cloudPositions.forEach(([x, y, z]) => {
      const c = createCloudMesh();
      c.position.set(x, y, z);
      c.scale.setScalar(1.05);
      this.scene.add(c);
      this.clouds.push(c);
    });
  }

  private buildThreeBranches(routes: JunctionRoute[]): void {
    // 3 đường tỏa ra từ Nhà An (-6.9, 0) tới Công viên Thiếu nhi (6.6, -0.2)
    const paths: Record<JunctionRouteId, THREE.Vector3[]> = {
      road1: [
        new THREE.Vector3(-6.9, 0.08, 0),
        new THREE.Vector3(-4.6, 0.08, -3.5),
        new THREE.Vector3(0.2, 0.08, -4.3),
        new THREE.Vector3(4.6, 0.08, -3.3),
        new THREE.Vector3(6.6, 0.08, -0.2),
      ],
      road2: [
        new THREE.Vector3(-6.9, 0.08, 0),
        new THREE.Vector3(-3.4, 0.08, 0.55),
        new THREE.Vector3(0.1, 0.08, 0.65),
        new THREE.Vector3(3.6, 0.08, 0.45),
        new THREE.Vector3(6.6, 0.08, -0.2),
      ],
      road3: [
        new THREE.Vector3(-6.9, 0.08, 0),
        new THREE.Vector3(-4.8, 0.08, 3.6),
        new THREE.Vector3(-1.6, 0.08, 4.55),
        new THREE.Vector3(1.65, 0.08, 4.65),
        new THREE.Vector3(4.9, 0.08, 3.5),
        new THREE.Vector3(6.6, 0.08, -0.2),
      ],
    };

    routes.forEach((route) => {
      const curve = new THREE.CatmullRomCurve3(paths[route.id]);

      // Dải đường nổi bật theo màu đường
      const tubeGeo = new THREE.TubeGeometry(curve, 44, 0.62, 8, false);
      tubeGeo.scale(1, 0.16, 1);
      const roadMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(route.hex),
        roughness: 0.55,
        metalness: 0.08,
      });
      const roadMesh = new THREE.Mesh(tubeGeo, roadMat);
      roadMesh.receiveShadow = true;
      roadMesh.castShadow = true;
      this.scene.add(roadMesh);

      // Viền sáng vàng khi chọn hoặc gợi ý
      const glowGeo = new THREE.TubeGeometry(curve, 44, 0.85, 8, false);
      glowGeo.scale(1, 0.1, 1);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.position.y = -0.02;
      this.scene.add(glowMesh);

      // Hit mesh lớn hơn để trẻ nhỏ chạm dễ trúng
      const hitGeo = new THREE.TubeGeometry(curve, 22, 1.35, 6, false);
      const hitMesh = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false }));
      hitMesh.userData.routeId = route.id;
      this.scene.add(hitMesh);
      this.hitMeshes.push(hitMesh);

      // 2 mốc chặng km trên từng con đường (trước và sau địa điểm mốc ở giữa)
      const t1 = route.id === 'road3' ? 0.2 : 0.26;
      const t2 = route.id === 'road3' ? 0.79 : 0.76;
      const seg1WorldPos = curve.getPointAt(t1);
      seg1WorldPos.y = 0.72;
      const seg2WorldPos = curve.getPointAt(t2);
      seg2WorldPos.y = 0.72;

      this.branches.push({
        route,
        curve,
        roadMesh,
        glowMesh,
        hitMesh,
        seg1WorldPos,
        seg2WorldPos,
        highlighted: false,
      });
    });
  }

  public highlightAndDriveRoute(routeId: JunctionRouteId, onComplete: () => void): void {
    this.branches.forEach((b) => {
      b.highlighted = b.route.id === routeId;
      if (b.route.id === routeId) {
        this.drivingBranch = b;
      }
    });
    this.driveProgress = 0;
    this.onDriveComplete = onComplete;
  }

  public flashBranch(routeId: JunctionRouteId): void {
    this.branches.forEach((b) => {
      b.highlighted = b.route.id === routeId;
    });
  }

  private updatePointer(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handlePointerDown(e: PointerEvent): void {
    if (this.drivingBranch) return;
    this.updatePointer(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.hitMeshes, false);
    if (hits.length > 0) {
      const id = hits[0].object.userData.routeId as JunctionRouteId;
      const branch = this.branches.find((b) => b.route.id === id);
      if (branch) {
        this.onSelectRoute(branch.route);
      }
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (this.drivingBranch) {
      this.renderer.domElement.style.cursor = 'default';
      return;
    }
    this.updatePointer(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.hitMeshes, false);
    this.renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'default';
  }

  private handleResize(): void {
    if (this.disposed) return;
    const w = Math.max(this.container.clientWidth, 1);
    const h = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = w / h;

    const isPortrait = w < h;
    // Hướng camera lệch nhẹ lên phía -Z để toàn bộ 3 con đường và trụ đèn nằm trọn dưới thanh tiêu đề trên
    this.camera.fov = isPortrait ? 58 : 42;
    this.camera.position.set(
      0.35,
      isPortrait ? 29.0 : 20.5,
      isPortrait ? 23.0 : 17.0
    );
    this.camera.lookAt(0.35, 0.3, isPortrait ? -1.6 : -1.4);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = this.paused ? 0 : Math.min(Math.max(rawDt, 0), 0.05);

      if (!this.paused) {
        this.update(dt);
        this.renderer.render(this.scene, this.camera);
        this.emitProjectedAnchors();
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
      this.emitProjectedAnchors();
      scheduleAfterSoftwareDraw(this.renderer, tick, (id) => {
        this.frameId = id;
      });
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private update(dt: number): void {
    this.elapsed += dt;

    // Xoay nhẹ vòng đu quay ở Công viên Thiếu nhi
    if (this.ferrisWheelRoot?.userData.wheelGroup) {
      const wheel = this.ferrisWheelRoot.userData.wheelGroup as THREE.Group;
      wheel.rotation.z += dt * 0.45;
    }

    // Mây trôi nhẹ
    for (let i = 0; i < this.clouds.length; i++) {
      this.clouds[i].position.x += dt * 0.25;
      if (this.clouds[i].position.x > 13) this.clouds[i].position.x = -13;
    }

    // Cập nhật độ sáng đường được chọn
    for (let i = 0; i < this.branches.length; i++) {
      const b = this.branches[i];
      const glowMat = b.glowMesh.material as THREE.MeshBasicMaterial;
      const targetOp = b.highlighted ? 0.92 : 0;
      glowMat.opacity = THREE.MathUtils.damp(glowMat.opacity, targetOp, 10, dt);
    }

    // Xe chạy dọc theo con đường đúng tới đích
    if (this.drivingBranch) {
      this.driveProgress = Math.min(1, this.driveProgress + dt * 0.52);
      this.drivingBranch.curve.getPointAt(this.driveProgress, this._posVec);
      this.drivingBranch.curve.getTangentAt(this.driveProgress, this._tanVec);

      this.carGroup.position.set(this._posVec.x, 0.05, this._posVec.z);
      const yaw = Math.atan2(-this._tanVec.x, -this._tanVec.z);
      this.carGroup.rotation.y = yaw;

      const wheels = this.carGroup.userData.wheels as THREE.Group[] | undefined;
      if (wheels) {
        this.wheelAngle -= dt * 16;
        for (let i = 0; i < wheels.length; i++) {
          wheels[i].rotation.x = this.wheelAngle;
        }
      }

      if (this.driveProgress >= 1 && this.onDriveComplete) {
        const cb = this.onDriveComplete;
        this.onDriveComplete = null;
        cb();
      }
    }
  }

  private projectWorldPoint(vec: THREE.Vector3, w: number, h: number): ProjectedPoint {
    this._projVec.copy(vec);
    this._projVec.project(this.camera);
    return {
      x: ((this._projVec.x + 1) / 2) * w,
      y: (-(this._projVec.y - 1) / 2) * h,
      visible: this._projVec.z < 1,
    };
  }

  private emitProjectedAnchors(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w <= 0 || h <= 0) return;

    const routes: ProjectedRouteLabel[] = this.branches.map((b) => ({
      id: b.route.id,
      seg1: this.projectWorldPoint(b.seg1WorldPos, w, h),
      seg2: this.projectWorldPoint(b.seg2WorldPos, w, h),
    }));

    this.onProjectAnchors({
      routes,
      start: this.projectWorldPoint(this.startLabelWorldPos, w, h),
      shop: this.projectWorldPoint(this.shopLabelWorldPos, w, h),
      destination: this.projectWorldPoint(this.destLabelWorldPos, w, h),
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResizeBound);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDownBound);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMoveBound);
    document.removeEventListener('visibilitychange', this.onVisibilityBound);

    disposeObject3D(this.scene);
    this.envTex.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
