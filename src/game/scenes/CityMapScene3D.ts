// Bản đồ thành phố mini 3D chọn điểm đến với 4 tòa nhà low-poly tương tác
import * as THREE from 'three';
import type { DestinationId } from '../data';
import {
  createConeTreeMesh,
  createDestinationBuilding3D,
  createRoundTreeMesh,
} from '../models3d';
import {
  applyStudioEnvironment,
  createStudioRenderer,
  disposeObject3D,
  scheduleAfterSoftwareDraw,
} from './webglDetect';

export interface ProjectedBuildingLabel {
  id: DestinationId;
  x: number;
  y: number;
  visible: boolean;
}

interface BuildingNode {
  id: DestinationId;
  group: THREE.Group;
  ring: THREE.Mesh;
  hitBox: THREE.Mesh;
  hopTimer: number;
  anchorWorld: THREE.Vector3;
}

export class CityMapScene3D {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private isSoftwareGl: boolean;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envTex: THREE.Texture;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private nodes: BuildingNode[] = [];
  private hitMeshes: THREE.Object3D[] = [];
  private selectedId: DestinationId;

  private onSelectCallback: (id: DestinationId) => void;
  private onProjectLabels: (labels: ProjectedBuildingLabel[]) => void;

  private frameId = 0;
  private disposed = false;
  private paused = false;
  private lastTime = performance.now();
  private elapsed = 0;
  private _projVec = new THREE.Vector3();

  private onResizeBound: () => void;
  private onPointerDownBound: (e: PointerEvent) => void;
  private onPointerMoveBound: (e: PointerEvent) => void;
  private onVisibilityBound: () => void;

  constructor(
    container: HTMLElement,
    initialDest: DestinationId,
    onSelect: (id: DestinationId) => void,
    onProjectLabels: (labels: ProjectedBuildingLabel[]) => void
  ) {
    this.container = container;
    this.selectedId = initialDest;
    this.onSelectCallback = onSelect;
    this.onProjectLabels = onProjectLabels;

    const { renderer, isSoftwareGl } = createStudioRenderer(container, { alpha: true });
    this.renderer = renderer;
    this.isSoftwareGl = isSoftwareGl;
    this.renderer.setClearColor(0xbae6fd, 1);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xbfe7fe);
    this.envTex = applyStudioEnvironment(this.renderer, this.scene);

    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.5, 100);
    this.camera.position.set(0, 12.5, 14.5);
    this.camera.lookAt(0, 0.6, 0);

    this.setupLights();
    this.buildCityIsland();

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
    sun.position.set(10, 18, 10);
    if (!this.isSoftwareGl) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      const d = 12;
      sun.shadow.camera.left = -d;
      sun.shadow.camera.right = d;
      sun.shadow.camera.top = d;
      sun.shadow.camera.bottom = -d;
      sun.shadow.bias = -0.0005;
    }
    this.scene.add(sun);
  }

  private buildCityIsland(): void {
    // Đảo thành phố xanh mát hình tròn
    const grass = new THREE.Mesh(
      new THREE.CylinderGeometry(10.5, 11.2, 0.9, 32),
      new THREE.MeshStandardMaterial({ color: 0x34b856, roughness: 0.9 })
    );
    grass.position.y = -0.45;
    grass.receiveShadow = true;
    this.scene.add(grass);

    // Đường chữ thập nối 4 khu vực và vòng xuyến ở giữa
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
    const roadX = new THREE.Mesh(new THREE.PlaneGeometry(17.5, 2.2), roadMat);
    roadX.rotation.x = -Math.PI / 2;
    roadX.position.y = 0.02;
    roadX.receiveShadow = true;

    const roadZ = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 17.5), roadMat);
    roadZ.rotation.x = -Math.PI / 2;
    roadZ.position.y = 0.02;
    roadZ.receiveShadow = true;

    const roundabout = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.1, 0.05, 24),
      roadMat
    );
    roundabout.position.y = 0.025;

    const plazaCenter = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.25, 0.2, 20),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.7 })
    );
    plazaCenter.position.y = 0.1;

    this.scene.add(roadX, roadZ, roundabout, plazaCenter);

    // Cây trang trí nhỏ quanh đảo
    const treeCoords: Array<[number, number, boolean]> = [
      [-7.8, 0, true],
      [7.8, 0, false],
      [0, -7.8, true],
      [0, 7.8, false],
      [-7.5, -7.2, false],
      [7.5, 7.2, true],
    ];
    treeCoords.forEach(([x, z, round]) => {
      const t = round ? createRoundTreeMesh(0.7) : createConeTreeMesh(0.75);
      t.position.set(x, 0, z);
      this.scene.add(t);
    });

    // 4 tòa nhà điểm đến ở 4 góc thành phố mini
    const layout: Array<{ id: DestinationId; x: number; z: number; rotY: number }> = [
      { id: 'library', x: -4.2, z: -3.8, rotY: 0.35 },
      { id: 'hospital', x: 4.2, z: -3.8, rotY: -0.35 },
      { id: 'school', x: -4.2, z: 3.8, rotY: 0.25 },
      { id: 'park', x: 4.2, z: 3.8, rotY: -0.25 },
    ];

    layout.forEach((item) => {
      const bGroup = createDestinationBuilding3D(item.id);
      bGroup.position.set(item.x, 0, item.z);
      bGroup.rotation.y = item.rotY;
      this.scene.add(bGroup);

      // Vòng sáng chọn dưới chân tòa nhà
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.25, 2.65, 28),
        new THREE.MeshBasicMaterial({
          color: 0xffd93d,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: item.id === this.selectedId ? 0.95 : 0.0,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(item.x, 0.06, item.z);
      this.scene.add(ring);

      // Hộp chạm vô hình to dễ bấm trên màn hình cảm ứng
      const hitBox = new THREE.Mesh(
        new THREE.BoxGeometry(4.4, 4.2, 4.0),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitBox.position.set(item.x, 1.9, item.z);
      hitBox.userData.destId = item.id;
      this.scene.add(hitBox);
      this.hitMeshes.push(hitBox);

      this.nodes.push({
        id: item.id,
        group: bGroup,
        ring,
        hitBox,
        hopTimer: item.id === this.selectedId ? 0.5 : 0,
        anchorWorld: new THREE.Vector3(item.x, 3.85, item.z),
      });
    });
  }

  public setSelected(id: DestinationId): void {
    this.selectedId = id;
    this.nodes.forEach((n) => {
      if (n.id === id) {
        n.hopTimer = 1;
      }
    });
  }

  private updatePointer(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handlePointerDown(e: PointerEvent): void {
    this.updatePointer(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.hitMeshes, false);
    if (hits.length > 0) {
      const id = hits[0].object.userData.destId as DestinationId;
      if (id) {
        this.setSelected(id);
        this.onSelectCallback(id);
      }
    }
  }

  private handlePointerMove(e: PointerEvent): void {
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
    this.camera.fov = w < h ? 55 : 42;
    this.camera.position.set(0, w < h ? 14.2 : 12.2, w < h ? 15.8 : 14.0);
    this.camera.lookAt(0, 0.5, 0);
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
        this.emitProjectedLabels();
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
      this.emitProjectedLabels();
      scheduleAfterSoftwareDraw(this.renderer, tick, (id) => {
        this.frameId = id;
      });
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private update(dt: number): void {
    this.elapsed += dt;

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const isSelected = node.id === this.selectedId;
      const ringMat = node.ring.material as THREE.MeshBasicMaterial;
      ringMat.opacity = THREE.MathUtils.damp(ringMat.opacity, isSelected ? 0.95 : 0, 10, dt);

      if (isSelected) {
        const s = 1 + Math.sin(this.elapsed * 3.5) * 0.06;
        node.ring.scale.set(s, s, 1);
      }

      if (node.hopTimer > 0) {
        node.hopTimer = Math.max(0, node.hopTimer - dt * 2.2);
        node.group.position.y = Math.sin((1 - node.hopTimer) * Math.PI) * 0.65;
      } else {
        node.group.position.y = isSelected ? Math.sin(this.elapsed * 3) * 0.12 + 0.12 : 0;
      }

      const targetScale = isSelected ? 1.09 : 0.96;
      const curScale = node.group.scale.x;
      const nextScale = THREE.MathUtils.damp(curScale, targetScale, 9, dt);
      node.group.scale.setScalar(nextScale);
    }
  }

  private emitProjectedLabels(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w <= 0 || h <= 0) return;

    const labels: ProjectedBuildingLabel[] = this.nodes.map((n) => {
      this._projVec.copy(n.anchorWorld);
      this._projVec.y += n.group.position.y;
      this._projVec.project(this.camera);
      const visible = this._projVec.z < 1;
      return {
        id: n.id,
        x: ((this._projVec.x + 1) / 2) * w,
        y: (-(this._projVec.y - 1) / 2) * h,
        visible,
      };
    });

    this.onProjectLabels(labels);
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
