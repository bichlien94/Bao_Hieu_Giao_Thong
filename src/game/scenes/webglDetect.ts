// Phát hiện WebGL, phần cứng đồ họa và khởi tạo Studio Renderer chuẩn Three.js r160
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface WebGLCapabilitiesInfo {
  supported: boolean;
  isSoftwareGl: boolean;
}

let cachedCaps: WebGLCapabilitiesInfo | null = null;

export function detectWebGLCapabilities(): WebGLCapabilitiesInfo {
  if (cachedCaps) return cachedCaps;

  try {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    const gl = gl2 || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
      cachedCaps = { supported: false, isSoftwareGl: false };
      return cachedCaps;
    }

    const webglCtx = gl as WebGLRenderingContext;
    const ext = webglCtx.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : webglCtx.RENDERER;
    const gpu = String(webglCtx.getParameter(param) || '');
    webglCtx.getExtension('WEBGL_lose_context')?.loseContext();

    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    cachedCaps = { supported: true, isSoftwareGl };
    return cachedCaps;
  } catch {
    cachedCaps = { supported: false, isSoftwareGl: false };
    return cachedCaps;
  }
}

export function createStudioRenderer(
  container: HTMLElement,
  opts?: { alpha?: boolean; preserveDrawingBuffer?: boolean }
): { renderer: THREE.WebGLRenderer; isSoftwareGl: boolean } {
  const { isSoftwareGl } = detectWebGLCapabilities();

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    alpha: Boolean(opts?.alpha),
    powerPreference: 'high-performance',
    preserveDrawingBuffer: Boolean(opts?.preserveDrawingBuffer),
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const width = Math.max(container.clientWidth, 1);
  const height = Math.max(container.clientHeight, 1);
  renderer.setSize(width, height);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  return { renderer, isSoftwareGl };
}

export function applyStudioEnvironment(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene
): THREE.Texture {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  pmremGenerator.dispose();
  return envTex;
}

// Chờ GPU phần mềm hoàn tất vẽ trước khi lập lịch khung hình tiếp theo
export function scheduleAfterSoftwareDraw(
  renderer: THREE.WebGLRenderer,
  cb: () => void,
  setTimerId: (id: number) => void
): void {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  if (typeof gl.fenceSync === 'function') {
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        setTimerId(window.setTimeout(poll, 5));
      } else {
        if (sync) gl.deleteSync(sync);
        setTimerId(window.setTimeout(cb, 80));
      }
    };
    setTimerId(window.setTimeout(poll, 5));
  } else {
    setTimerId(window.setTimeout(cb, 80));
  }
}

export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        if (m) {
          const std = m as THREE.MeshStandardMaterial;
          if (std.map) std.map.dispose();
          m.dispose();
        }
      });
    }
  });
}
