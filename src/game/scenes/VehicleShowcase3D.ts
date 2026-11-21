// Trình diễn 4 mẫu xe 3D xoay chậm bằng 1 WebGLRenderer dùng chung (Scissor + Viewport)
import * as THREE from 'three';
import type { VehicleId } from '../data';
import { createVehicleMesh } from '../models3d';
import {
  applyStudioEnvironment,
  createStudioRenderer,
  disposeObject3D,
  scheduleAfterSoftwareDraw,
} from './webglDetect';

interface VehicleSlot {
  id: VehicleId;
  element: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  car: THREE.Group;
  bouncePhase: number;
  selected: boolean;
}

export class VehicleShowcase3D {
  private hostEl: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private isSoftwareGl: boolean;
  private envTex: THREE.Texture;
  private slots: VehicleSlot[] = [];

  private frameId = 0;
  private disposed = false;
  private paused = false;
  private lastTime = performance.now();
  private elapsed = 0;
  private reducedMotion = false;

  private onResizeBound: () => void;
  private onVisibilityBound: () => void;

  constructor(
    hostEl: HTMLElement,
    slotElements: Record<VehicleId, HTMLElement>,
    initialSelected: VehicleId
  ) {
    this.hostEl = hostEl;
    this.reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const { renderer, isSoftwareGl } = createStudioRenderer(hostEl, { alpha: true });
    this.renderer = renderer;
    this.isSoftwareGl = isSoftwareGl;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setScissorTest(true);

    const dummyScene = new THREE.Scene();
    this.envTex = applyStudioEnvironment(this.renderer, dummyScene);

    const ids: VehicleId[] = ['family', 'taxi', 'police', 'bus'];
    ids.forEach((id, idx) => {
      const scene = new THREE.Scene();
      scene.environment = this.envTex;

      const hemi = new THREE.HemisphereLight(0xdbeafe, 0xfef3c7, 0.58);
      const dir = new THREE.DirectionalLight(0xfffdf5, 1.0);
      dir.position.set(4, 7, 5);
      scene.add(hemi, dir);

      // Đĩa nền nhỏ xinh dưới xe
      const discGeo = new THREE.CylinderGeometry(2.35, 2.5, 0.14, 24);
      const discMat = new THREE.MeshStandardMaterial({
        color: 0xe0f2fe,
        roughness: 0.75,
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.position.y = -0.08;
      scene.add(disc);

      const car = createVehicleMesh(id);
      const baseScale = id === 'bus' ? 0.85 : 1.0;
      car.scale.setScalar(baseScale);
      car.rotation.y = Math.PI * 0.25 + idx * 0.4;
      scene.add(car);

      const cam = new THREE.PerspectiveCamera(36, 1.5, 0.1, 40);
      cam.position.set(0, 2.35, 6.2);
      cam.lookAt(0, 0.75, 0);

      this.slots.push({
        id,
        element: slotElements[id],
        scene,
        camera: cam,
        car,
        bouncePhase: id === initialSelected ? 1 : 0,
        selected: id === initialSelected,
      });
    });

    this.onResizeBound = () => this.handleResize();
    this.onVisibilityBound = () => {
      this.paused = document.hidden;
      if (!this.paused) this.lastTime = performance.now();
    };
    window.addEventListener('resize', this.onResizeBound);
    document.addEventListener('visibilitychange', this.onVisibilityBound);

    this.handleResize();
    this.startLoop();
  }

  public setSelected(id: VehicleId): void {
    this.slots.forEach((slot) => {
      slot.selected = slot.id === id;
      if (slot.id === id) {
        slot.bouncePhase = 1;
      }
    });
  }

  private handleResize(): void {
    if (this.disposed) return;
    const w = Math.max(this.hostEl.clientWidth, 1);
    const h = Math.max(this.hostEl.clientHeight, 1);
    this.renderer.setSize(w, h, false);
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = this.paused ? 0 : Math.min(Math.max(rawDt, 0), 0.05);

      if (!this.paused) {
        this.renderAllSlots(dt);
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
      this.renderAllSlots(0.016);
      scheduleAfterSoftwareDraw(this.renderer, tick, (id) => {
        this.frameId = id;
      });
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private renderAllSlots(dt: number): void {
    this.elapsed += dt;
    const hostRect = this.hostEl.getBoundingClientRect();
    const canvasH = this.hostEl.clientHeight;
    const canvasW = this.hostEl.clientWidth;

    if (canvasW <= 0 || canvasH <= 0) return;
    if (
      this.renderer.domElement.width !== Math.round(canvasW * this.renderer.getPixelRatio()) ||
      this.renderer.domElement.height !== Math.round(canvasH * this.renderer.getPixelRatio())
    ) {
      this.renderer.setSize(canvasW, canvasH, false);
    }

    const rotSpeed = this.reducedMotion ? 0.15 : 0.72;

    this.renderer.setScissorTest(false);
    this.renderer.clear();
    this.renderer.setScissorTest(true);

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const rect = slot.element.getBoundingClientRect();

      if (rect.width <= 0 || rect.height <= 0) continue;

      const left = rect.left - hostRect.left;
      const bottom = hostRect.bottom - rect.bottom;

      if (left + rect.width < 0 || left > canvasW || bottom + rect.height < 0 || bottom > canvasH) {
        continue;
      }

      slot.car.rotation.y += rotSpeed * dt * (slot.selected ? 1.45 : 0.85);

      if (slot.bouncePhase > 0) {
        slot.bouncePhase = Math.max(0, slot.bouncePhase - dt * 2.1);
        const hop = Math.sin((1 - slot.bouncePhase) * Math.PI) * 0.55;
        slot.car.position.y = hop;
      } else {
        slot.car.position.y = 0;
      }

      slot.camera.aspect = rect.width / rect.height;
      slot.camera.updateProjectionMatrix();

      this.renderer.setViewport(left, bottom, rect.width, rect.height);
      this.renderer.setScissor(left, bottom, rect.width, rect.height);
      this.renderer.render(slot.scene, slot.camera);
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResizeBound);
    document.removeEventListener('visibilitychange', this.onVisibilityBound);

    this.slots.forEach((s) => disposeObject3D(s.scene));
    this.envTex.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.hostEl) {
      this.hostEl.removeChild(this.renderer.domElement);
    }
  }
}
