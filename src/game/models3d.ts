// Bộ dựng mô hình 3D low-poly thủ công (không tải file ngoài)
import * as THREE from 'three';
import type { DestinationId, SignArtId, SignShape, TrafficSignQuestion, VehicleId } from './data';

// Tạo texture bóng tiếp xúc mềm dưới đáy vật thể (tránh cảm giác lơ lửng)
let sharedContactShadowTex: THREE.CanvasTexture | null = null;
export function getContactShadowTexture(): THREE.CanvasTexture {
  if (sharedContactShadowTex) return sharedContactShadowTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.48)');
  grad.addColorStop(0.6, 'rgba(15, 23, 42, 0.18)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  sharedContactShadowTex = tex;
  return tex;
}

export function createContactShadow(width: number, depth: number, opacity = 0.7): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(width, depth);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: getContactShadowTexture(),
    transparent: true,
    depthWrite: false,
    opacity,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.02;
  return mesh;
}

// Tạo texture sọc caro cho xe Taxi
function createTaxiCheckerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const size = 32;
  for (let x = 0; x < 256; x += size) {
    for (let y = 0; y < 64; y += size) {
      const dark = ((x / size) + (y / size)) % 2 === 0;
      ctx.fillStyle = dark ? '#1E293B' : '#FFFFFF';
      ctx.fillRect(x, y, size, size);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  return tex;
}

// Tạo texture chữ TAXI phát sáng nhẹ
function createTaxiSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 88);
  ctx.fillStyle = '#1E293B';
  ctx.font = '900 54px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TAXI', 128, 50);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Tạo mô hình xe 3D composite (8-12 phần), tâm đáy đặt tại y = 0, đầu xe hướng về -Z
export function createVehicleMesh(vehicleId: VehicleId): THREE.Group {
  const root = new THREE.Group();
  const bodyRoot = new THREE.Group(); // Phần thân nhún tách rời bóng tiếp xúc
  root.add(bodyRoot);

  const isBus = vehicleId === 'bus';
  const carLength = isBus ? 4.3 : 3.2;
  const carWidth = isBus ? 1.85 : 1.72;

  root.add(createContactShadow(carWidth * 1.45, carLength * 1.32, 0.82));

  const bodyColors: Record<VehicleId, number> = {
    family: 0xe11d48,
    taxi: 0xf59e0b,
    police: 0xf8fafc,
    bus: 0xf97316,
  };

  const paintMat = new THREE.MeshStandardMaterial({
    color: bodyColors[vehicleId],
    roughness: 0.36,
    metalness: 0.12,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.72,
    metalness: 0.08,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.16,
    metalness: 0.24,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfef08a,
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });

  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xff2233,
    emissiveIntensity: 0.8,
    roughness: 0.25,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.88,
    metalness: 0.05,
  });

  const hubMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.22,
    metalness: 0.72,
  });

  // 1. Thân dưới (chassis)
  if (isBus) {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.76, 1.38, 4.1), paintMat);
    hull.position.set(0, 1.0, 0);
    hull.castShadow = true;
    hull.receiveShadow = true;
    bodyRoot.add(hull);

    // Mái bo vàng
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      roughness: 0.42,
      metalness: 0.08,
    });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.16, 3.85), roofMat);
    roof.position.set(0, 1.74, 0);
    roof.castShadow = true;
    bodyRoot.add(roof);

    // Dải trang trí xanh dương dọc thân xe buýt
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.45 });
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.79, 0.18, 4.12), stripeMat);
    stripe.position.set(0, 0.76, 0);
    bodyRoot.add(stripe);

    // Kính chắn gió trước & sau
    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.55, 0.08), glassMat);
    frontGlass.position.set(0, 1.3, -2.04);
    bodyRoot.add(frontGlass);

    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.48, 0.08), glassMat);
    rearGlass.position.set(0, 1.32, 2.04);
    bodyRoot.add(rearGlass);

    // Cửa sổ bên hông (3 khung mỗi bên)
    [-1.15, 0, 1.15].forEach((zOff) => {
      const sideWin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.46, 0.85), glassMat);
      sideWin.position.set(0, 1.32, zOff);
      bodyRoot.add(sideWin);
    });

    // Cụm điều hòa trên nóc
    const acMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
    const ac = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.18, 1.1), acMat);
    ac.position.set(0, 1.88, -0.3);
    ac.castShadow = true;
    bodyRoot.add(ac);
  } else {
    // Xe 4 chỗ (Family / Taxi / Police)
    const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.62, 3.1), paintMat);
    lowerHull.position.set(0, 0.58, 0);
    lowerHull.castShadow = true;
    lowerHull.receiveShadow = true;
    bodyRoot.add(lowerHull);

    // Khoang cabin trên
    const cabinMat =
      vehicleId === 'police'
        ? new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.34, metalness: 0.18 })
        : paintMat;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.58, 1.72), cabinMat);
    cabin.position.set(0, 1.14, 0.12);
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    bodyRoot.add(cabin);

    // Kính chắn gió trước (nghiêng nhẹ)
    const frontWindshield = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.48, 0.1), glassMat);
    frontWindshield.position.set(0, 1.12, -0.74);
    frontWindshield.rotation.x = 0.25;
    bodyRoot.add(frontWindshield);

    // Kính hậu (nghiêng nhẹ về sau)
    const rearWindshield = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.44, 0.1), glassMat);
    rearWindshield.position.set(0, 1.12, 0.98);
    rearWindshield.rotation.x = -0.22;
    bodyRoot.add(rearWindshield);

    // Kính hai bên
    const sideWindows = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.4, 1.32), glassMat);
    sideWindows.position.set(0, 1.14, 0.12);
    bodyRoot.add(sideWindows);

    // Phụ kiện riêng theo từng xe
    if (vehicleId === 'family') {
      // Giá nóc & vali xanh bạc hà dễ thương
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.06, 1.05), trimMat);
      rack.position.set(0, 1.46, 0.15);
      bodyRoot.add(rack);
      const bagMat = new THREE.MeshStandardMaterial({ color: 0x6bcb77, roughness: 0.48 });
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.24, 0.62), bagMat);
      bag.position.set(0, 1.6, 0.15);
      bag.castShadow = true;
      bodyRoot.add(bag);
    } else if (vehicleId === 'taxi') {
      // Sọc caro hai bên hông
      const checkerMat = new THREE.MeshStandardMaterial({
        map: createTaxiCheckerTexture(),
        roughness: 0.45,
      });
      const checkerStrip = new THREE.Mesh(new THREE.BoxGeometry(1.69, 0.16, 1.9), checkerMat);
      checkerStrip.position.set(0, 0.62, 0.05);
      bodyRoot.add(checkerStrip);

      // Biển TAXI trên nóc
      const taxiTopMat = new THREE.MeshStandardMaterial({
        map: createTaxiSignTexture(),
        emissive: 0xfef08a,
        emissiveIntensity: 0.25,
        roughness: 0.3,
      });
      const taxiTop = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.24, 0.3), taxiTopMat);
      taxiTop.position.set(0, 1.54, 0.05);
      taxiTop.castShadow = true;
      bodyRoot.add(taxiTop);
    } else if (vehicleId === 'police') {
      // Cửa/nắp capo xanh đậm nổi bật
      const navyMat = new THREE.MeshStandardMaterial({
        color: 0x1e3a8a,
        roughness: 0.34,
        metalness: 0.16,
      });
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.1, 0.92), navyMat);
      hood.position.set(0, 0.87, -1.04);
      bodyRoot.add(hood);

      // Đèn ưu tiên xanh - đỏ trên nóc
      const barBase = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.07, 0.24), trimMat);
      barBase.position.set(0, 1.46, 0.05);
      bodyRoot.add(barBase);

      const redLightMat = new THREE.MeshStandardMaterial({
        color: 0xff3b30,
        emissive: 0xff2d20,
        emissiveIntensity: 0.85,
        roughness: 0.2,
      });
      const blueLightMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.85,
        roughness: 0.2,
      });
      const redBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.22), redLightMat);
      redBeacon.position.set(-0.24, 1.55, 0.05);
      const blueBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.22), blueLightMat);
      blueBeacon.position.set(0.24, 1.55, 0.05);
      bodyRoot.add(redBeacon, blueBeacon);
      root.userData.policeRed = redLightMat;
      root.userData.policeBlue = blueLightMat;
    }
  }

  // Cản trước & cản sau
  const zBumper = isBus ? 2.08 : 1.58;
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.18, 0.14), trimMat);
  frontBumper.position.set(0, 0.36, -zBumper);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.18, 0.14), trimMat);
  rearBumper.position.set(0, 0.36, zBumper);
  bodyRoot.add(frontBumper, rearBumper);

  // Đèn pha trước & đèn hậu sau
  const zLights = isBus ? 2.06 : 1.56;
  const yLight = isBus ? 0.62 : 0.6;
  [-0.58, 0.58].forEach((xOff) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.06), headlightMat);
    hl.position.set(xOff, yLight, -zLights);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.06), taillightMat);
    tl.position.set(xOff, yLight, zLights);
    bodyRoot.add(hl, tl);
  });

  // 4 bánh xe quay thực sự quanh trục X
  const wheelZ = isBus ? 1.28 : 0.96;
  const wheelX = isBus ? 0.86 : 0.82;
  const wheelRadius = 0.32;
  const wheels: THREE.Group[] = [];

  const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.24, 14);
  tireGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(wheelRadius * 0.55, wheelRadius * 0.55, 0.26, 10);
  hubGeo.rotateZ(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(0.28, 0.08, wheelRadius * 0.85);

  const wheelPositions: Array<[number, number, number]> = [
    [-wheelX, wheelRadius, -wheelZ],
    [wheelX, wheelRadius, -wheelZ],
    [-wheelX, wheelRadius, wheelZ],
    [wheelX, wheelRadius, wheelZ],
  ];

  wheelPositions.forEach(([wx, wy, wz]) => {
    const wg = new THREE.Group();
    wg.position.set(wx, wy, wz);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    const hub = new THREE.Mesh(hubGeo, hubMat);
    const spoke = new THREE.Mesh(spokeGeo, trimMat);
    wg.add(tire, hub, spoke);
    root.add(wg);
    wheels.push(wg);
  });

  root.userData.wheels = wheels;
  root.userData.bodyRoot = bodyRoot;
  return root;
}

// Vẽ mặt đồng hồ cho trường học
function createClockFaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#1E293B';
  ctx.stroke();

  // Kim đồng hồ
  ctx.strokeStyle = '#1E293B';
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(64, 64);
  ctx.lineTo(64, 28);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(64, 64);
  ctx.lineTo(92, 64);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Tạo 4 tòa nhà điểm đến 3D low-poly đặc trưng
export function createDestinationBuilding3D(destId: DestinationId): THREE.Group {
  const group = new THREE.Group();
  group.add(createContactShadow(4.4, 3.8, 0.72));

  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 0.35,
    roughness: 0.25,
  });

  const basePadMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.85,
  });

  if (destId === 'library') {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.25, 3.0), basePadMat);
    pad.position.y = 0.125;
    pad.receiveShadow = true;
    group.add(pad);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.0, 2.3), wallMat);
    body.position.y = 1.25;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.5 });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.55, 1.3, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 2.9;
    roof.castShadow = true;
    group.add(roof);

    // 4 cột trụ mặt tiền
    const colMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
    [-1.15, -0.45, 0.45, 1.15].forEach((x) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 1.9, 10), colMat);
      col.position.set(x, 1.2, 1.24);
      col.castShadow = true;
      group.add(col);
    });

    // Biểu tượng quyển sách mở trên mái/trước
    const bookLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.55, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 })
    );
    bookLeft.position.set(-0.22, 2.15, 1.26);
    bookLeft.rotation.y = 0.22;
    const bookRight = bookLeft.clone();
    bookRight.position.x = 0.22;
    bookRight.rotation.y = -0.22;
    group.add(bookLeft, bookRight);

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 1.1, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.65 })
    );
    door.position.set(0, 0.8, 1.15);
    group.add(door);
  } else if (destId === 'hospital') {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.2, 3.1), basePadMat);
    pad.position.y = 0.1;
    pad.receiveShadow = true;
    group.add(pad);

    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.48 });
    const mainHall = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.7, 2.2), whiteMat);
    mainHall.position.y = 1.55;
    mainHall.castShadow = true;
    mainHall.receiveShadow = true;
    group.add(mainHall);

    const sideWing = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.6, 1.8), whiteMat);
    sideWing.position.set(0, 1.0, 0.05);
    sideWing.castShadow = true;
    group.add(sideWing);

    const trimRedMat = new THREE.MeshStandardMaterial({ color: 0xff5a5f, roughness: 0.38 });
    const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.2, 2.34), trimRedMat);
    roofTrim.position.y = 2.95;
    group.add(roofTrim);

    // Chữ thập đỏ lớn phía trước
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.78, 0.14), trimRedMat);
    crossV.position.set(0, 2.28, 1.12);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.26, 0.14), trimRedMat);
    crossH.position.set(0, 2.28, 1.12);
    group.add(crossV, crossH);

    // Cửa kính xanh + cửa sổ
    const doorGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 1.0, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.15, metalness: 0.2 })
    );
    doorGlass.position.set(0, 0.7, 1.12);
    group.add(doorGlass);

    [-1.25, 1.25].forEach((x) => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), windowMat);
      win.position.set(x, 1.1, 0.96);
      group.add(win);
    });
  } else if (destId === 'school') {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.2, 3.0), basePadMat);
    pad.position.y = 0.1;
    group.add(pad);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.8, 2.1), wallMat);
    body.position.y = 1.1;
    body.castShadow = true;
    group.add(body);

    const roofMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.15, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 2.55;
    roof.castShadow = true;
    group.add(roof);

    // Tháp đồng hồ + lá cờ
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.1, 0.95), wallMat);
    tower.position.set(0, 2.75, 0.25);
    tower.castShadow = true;
    group.add(tower);

    const clockMat = new THREE.MeshStandardMaterial({
      map: createClockFaceTexture(),
      roughness: 0.35,
    });
    const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 16), clockMat);
    clock.rotation.x = Math.PI / 2;
    clock.position.set(0, 2.85, 0.74);
    group.add(clock);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.7, roughness: 0.3 })
    );
    pole.position.set(0, 3.7, 0.25);
    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.35, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 })
    );
    flag.position.set(0.28, 3.95, 0.25);
    group.add(pole, flag);

    [-0.95, 0.95].forEach((x) => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.1), windowMat);
      win.position.set(x, 1.25, 1.06);
      group.add(win);
    });
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.95, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.7 })
    );
    door.position.set(0, 0.68, 1.06);
    group.add(door);
  } else {
    // Công viên (Park)
    const lawn = new THREE.Mesh(
      new THREE.CylinderGeometry(1.95, 2.05, 0.25, 16),
      new THREE.MeshStandardMaterial({ color: 0x6bcb77, roughness: 0.85 })
    );
    lawn.position.y = 0.125;
    lawn.receiveShadow = true;
    group.add(lawn);

    // Đài phun nước ở giữa
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.75 });
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.36, 14), stoneMat);
    basin.position.y = 0.42;
    basin.castShadow = true;
    group.add(basin);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.15,
      metalness: 0.15,
    });
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.38, 14), waterMat);
    water.position.y = 0.44;
    group.add(water);

    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.95, 10), stoneMat);
    spout.position.y = 0.85;
    group.add(spout);

    const splash = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), waterMat);
    splash.position.y = 1.38;
    group.add(splash);

    // Cổng vòm & 2 cây xanh
    const archMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.65 });
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 0.2), archMat);
    postL.position.set(-0.9, 0.95, 1.35);
    const postR = postL.clone();
    postR.position.x = 0.9;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.24, 0.24), archMat);
    beam.position.set(0, 1.75, 1.35);
    group.add(postL, postR, beam);

    const tree1 = createRoundTreeMesh(0.85);
    tree1.position.set(-1.15, 0.22, -0.75);
    const tree2 = createConeTreeMesh(0.85);
    tree2.position.set(1.15, 0.22, -0.75);
    group.add(tree1, tree2);
  }

  return group;
}

// Tạo nhà phố low-poly trang trí hai bên đường (màu rực rỡ nổi bật trên nền cỏ)
const HOUSE_PALETTES = [
  { wall: 0xfde68a, roof: 0xef4444 },
  { wall: 0xbfdbfe, roof: 0xf97316 },
  { wall: 0xfbcfe8, roof: 0x8b5cf6 },
  { wall: 0xbbf7d0, roof: 0x0284c7 },
  { wall: 0xfed7aa, roof: 0x16a34a },
];

export function createHouseMesh(paletteIdx: number, scale = 1): THREE.Group {
  const pal = HOUSE_PALETTES[paletteIdx % HOUSE_PALETTES.length];
  const group = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({ color: pal.wall, roughness: 0.78 });
  const roofMat = new THREE.MeshStandardMaterial({ color: pal.roof, roughness: 0.58 });
  const winMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 0.4,
    roughness: 0.25,
  });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.72 });

  const h = 2.6 + (paletteIdx % 2) * 0.9;
  const w = 2.8;
  const d = 2.6;

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.25, 1.45, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = h + 0.72;
  roof.castShadow = true;
  group.add(roof);

  // Cửa sổ vàng 2 mặt để nhìn đẹp từ đường
  [-0.65, 0.65].forEach((offset) => {
    const winFront = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.1), winMat);
    winFront.position.set(offset, h * 0.62, d / 2 + 0.02);
    const winSide = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.55), winMat);
    winSide.position.set(-w / 2 - 0.02, h * 0.62, offset);
    const winSideR = winSide.clone();
    winSideR.position.x = w / 2 + 0.02;
    group.add(winFront, winSide, winSideR);
  });

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.05, 0.1), doorMat);
  door.position.set(0, 0.525, d / 2 + 0.02);
  group.add(door);

  group.scale.setScalar(scale);
  return group;
}

// Tạo cây tròn low-poly
export function createRoundTreeMesh(scale = 1): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.78 });
  const leafTopMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.74 });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 1.4, 7), trunkMat);
  trunk.position.y = 0.7;
  trunk.castShadow = true;
  group.add(trunk);

  const crown1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 1), leafMat);
  crown1.position.y = 1.9;
  crown1.castShadow = true;
  const crown2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.65, 1), leafTopMat);
  crown2.position.set(0.32, 2.38, 0.15);
  crown2.castShadow = true;
  group.add(crown1, crown2);

  group.scale.setScalar(scale);
  return group;
}

// Tạo cây nón low-poly
export function createConeTreeMesh(scale = 1): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
  const coneMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.78 });
  const coneTopMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.74 });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 1.1, 7), trunkMat);
  trunk.position.y = 0.55;
  trunk.castShadow = true;
  group.add(trunk);

  const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.5, 7), coneMat);
  c1.position.y = 1.6;
  c1.castShadow = true;
  const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.25, 7), coneTopMat);
  c2.position.y = 2.4;
  c2.castShadow = true;
  group.add(c1, c2);

  group.scale.setScalar(scale);
  return group;
}

// Tạo bụi hoa nhiều màu
export function createFlowerBushMesh(flowerColorHex: number): THREE.Group {
  const group = new THREE.Group();
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.85 });
  const flowerMat = new THREE.MeshStandardMaterial({ color: flowerColorHex, roughness: 0.55 });

  const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), bushMat);
  base.position.y = 0.3;
  base.scale.set(1.2, 0.75, 1.0);
  group.add(base);

  const offsets: Array<[number, number, number]> = [
    [-0.22, 0.52, 0.15],
    [0.2, 0.5, -0.1],
    [0.02, 0.58, 0.22],
  ];
  offsets.forEach(([x, y, z]) => {
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), flowerMat);
    fl.position.set(x, y, z);
    group.add(fl);
  });

  return group;
}

// Tạo đám mây bồng bềnh low-poly
export function createCloudMesh(): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.0,
  });

  const parts: Array<[number, number, number, number]> = [
    [0, 0, 0, 1.2],
    [-1.1, -0.15, 0.1, 0.9],
    [1.1, -0.18, -0.05, 0.85],
    [0.35, 0.45, 0.1, 0.8],
  ];
  parts.forEach(([x, y, z, r]) => {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat);
    puff.position.set(x, y, z);
    group.add(puff);
  });

  return group;
}

// Vẽ đồ họa chuẩn biển báo giao thông Việt Nam lên một HTMLCanvasElement (dùng chung cho 3D và HUD)
export function drawTrafficSignToCanvas(
  canvas: HTMLCanvasElement,
  shape: SignShape,
  art: SignArtId
): void {
  const isRect = shape === 'rectangle-signal';
  const sizeW = isRect ? 256 : 512;
  const sizeH = 512;
  canvas.width = sizeW;
  canvas.height = sizeH;
  const ctx = canvas.getContext('2d')!;
  const cx = sizeW / 2;
  const cy = sizeH / 2;

  ctx.clearRect(0, 0, sizeW, sizeH);

  if (shape === 'rectangle-signal') {
    // Trụ đèn giao thông hình chữ nhật đứng (3 đèn Đỏ - Vàng - Xanh)
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(6, 6, sizeW - 12, sizeH - 12);
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(18, 18, sizeW - 36, sizeH - 36);

    const lights = [
      { y: 112, fill: '#FF3B30', glow: '#FCA5A5', active: true },
      { y: 256, fill: '#A16207', glow: '#FDE047', active: false },
      { y: 400, fill: '#15803D', glow: '#86EFAC', active: false },
    ];
    lights.forEach((l) => {
      ctx.beginPath();
      ctx.arc(cx, l.y, 56, 0, Math.PI * 2);
      ctx.fillStyle = '#0F172A';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, l.y, 46, 0, Math.PI * 2);
      ctx.fillStyle = l.fill;
      ctx.fill();

      if (l.active) {
        ctx.beginPath();
        ctx.arc(cx - 12, l.y - 12, 14, 0, Math.PI * 2);
        ctx.fillStyle = l.glow;
        ctx.fill();
      }
    });
  } else if (shape === 'circle-prohibit') {
    // Tròn đỏ cấm
    if (art === 'no-entry') {
      ctx.beginPath();
      ctx.arc(cx, cy, 236, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 222, 0, Math.PI * 2);
      ctx.fillStyle = '#DC2626';
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - 145, cy - 38, 290, 76);
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, 236, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 42;
      ctx.strokeStyle = '#DC2626';
      ctx.beginPath();
      ctx.arc(cx, cy, 202, 0, Math.PI * 2);
      ctx.stroke();

      if (art === 'no-left-turn') {
        // Mũi tên rẽ trái đen
        ctx.strokeStyle = '#0F172A';
        ctx.fillStyle = '#0F172A';
        ctx.lineWidth = 34;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + 46, cy + 100);
        ctx.lineTo(cx + 46, cy - 22);
        ctx.quadraticCurveTo(cx + 46, cy - 68, cx - 2, cy - 68);
        ctx.lineTo(cx - 72, cy - 68);
        ctx.stroke();
        // Đầu mũi tên
        ctx.beginPath();
        ctx.moveTo(cx - 116, cy - 68);
        ctx.lineTo(cx - 48, cy - 116);
        ctx.lineTo(cx - 48, cy - 20);
        ctx.closePath();
        ctx.fill();
      } else if (art === 'no-horn') {
        // Hình chiếc kèn
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.moveTo(cx - 105, cy - 20);
        ctx.lineTo(cx - 20, cy - 20);
        ctx.lineTo(cx + 75, cy - 75);
        ctx.lineTo(cx + 75, cy + 75);
        ctx.lineTo(cx - 20, cy + 20);
        ctx.lineTo(cx - 105, cy + 20);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(cx - 115, cy - 30, 26, 60);
      }

      // Gạch chéo đỏ cấm
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 36;
      ctx.beginPath();
      ctx.moveTo(cx - 138, cy - 138);
      ctx.lineTo(cx + 138, cy + 138);
      ctx.stroke();
    }
  } else if (shape === 'circle-mandate') {
    // Biển hiệu lệnh nền xanh dương mũi tên trắng
    ctx.beginPath();
    ctx.arc(cx, cy, 236, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 222, 0, Math.PI * 2);
    ctx.fillStyle = '#0284C7';
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - 26, cy - 45, 52, 165);
    ctx.beginPath();
    ctx.moveTo(cx, cy - 145);
    ctx.lineTo(cx - 88, cy - 35);
    ctx.lineTo(cx + 88, cy - 35);
    ctx.closePath();
    ctx.fill();
  } else if (shape === 'square-info') {
    // Biển vuông xanh dương chữ P trắng
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(20, 20, 472, 472);
    ctx.fillStyle = '#0284C7';
    ctx.fillRect(36, 36, 440, 440);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 300px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', cx, cy + 16);
  } else {
    // Tam giác vàng viền đỏ (cảnh báo)
    const p1 = [cx, 38];
    const p2 = [472, 456];
    const p3 = [40, 456];

    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.lineTo(p3[0], p3[1]);
    ctx.closePath();
    ctx.fillStyle = '#FACC15';
    ctx.fill();
    ctx.lineWidth = 44;
    ctx.strokeStyle = '#DC2626';
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#0F172A';
    if (art === 'pedestrian') {
      // Vạch kẻ đường
      [-80, 0, 80].forEach((xOff) => {
        ctx.fillRect(cx + xOff - 22, 378, 44, 24);
      });
      // Người đi bộ
      ctx.beginPath();
      ctx.arc(cx, 222, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 22;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, 248);
      ctx.lineTo(cx - 6, 314);
      ctx.lineTo(cx - 42, 368);
      ctx.moveTo(cx - 6, 314);
      ctx.lineTo(cx + 38, 368);
      ctx.moveTo(cx - 44, 286);
      ctx.lineTo(cx + 42, 274);
      ctx.stroke();
    } else if (art === 'children') {
      // Hai bạn nhỏ nắm tay
      [-42, 42].forEach((xOff, i) => {
        const rHead = i === 0 ? 22 : 19;
        const yHead = i === 0 ? 248 : 262;
        ctx.beginPath();
        ctx.arc(cx + xOff, yHead, rHead, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx + xOff - 16, yHead + 24, 32, 62);
        ctx.fillRect(cx + xOff - 14, yHead + 84, 11, 38);
        ctx.fillRect(cx + xOff + 3, yHead + 84, 11, 38);
      });
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(cx - 26, 298);
      ctx.lineTo(cx + 26, 306);
      ctx.stroke();
    } else if (art === 'traffic-light') {
      // Cột đèn 3 màu
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(cx - 42, 185, 84, 212);
      const lights = [
        { y: 226, c: '#EF4444' },
        { y: 291, c: '#FACC15' },
        { y: 356, c: '#22C55E' },
      ];
      lights.forEach((l) => {
        ctx.beginPath();
        ctx.arc(cx, l.y, 24, 0, Math.PI * 2);
        ctx.fillStyle = l.c;
        ctx.fill();
      });
    } else if (art === 'railway') {
      // Hàng rào chắn đường sắt
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(cx - 115, 290, 230, 18);
      ctx.fillRect(cx - 115, 345, 230, 18);
      [-85, -30, 30, 85].forEach((xOff) => {
        ctx.fillRect(cx + xOff - 10, 255, 20, 140);
      });
    }
  }
}

export function createTrafficSignCanvasTexture(
  shape: SignShape,
  art: SignArtId,
  anisotropy = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  drawTrafficSignToCanvas(canvas, shape, art);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

// Dựng mô hình Biển báo 3D hoàn chỉnh (chân đế + cột thép + bảng biển đúng hình dạng)
export function createTrafficSign3D(
  sign: TrafficSignQuestion,
  anisotropy = 4
): THREE.Group {
  const group = new THREE.Group();
  group.add(createContactShadow(1.3, 1.3, 0.7));

  const poleMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.28,
    metalness: 0.72,
  });
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.88,
  });
  const backMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.45,
    metalness: 0.45,
  });

  // Đế bê tông & cột biển
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.25, 10), baseMat);
  base.position.y = 0.125;
  base.castShadow = true;
  group.add(base);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.7, 10), poleMat);
  pole.position.y = 1.45;
  pole.castShadow = true;
  group.add(pole);

  // Tấm biển đúng hình dạng 3D
  const faceTex = createTrafficSignCanvasTexture(sign.shape, sign.art, anisotropy);
  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    roughness: 0.38,
    metalness: 0.05,
    transparent: true,
    alphaTest: 0.15,
  });

  const boardHolder = new THREE.Group();
  boardHolder.position.set(0, 2.75, 0.09);

  if (sign.shape === 'rectangle-signal') {
    // Hộp đèn giao thông hình chữ nhật 3D nổi bật
    const housingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.2,
    });
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.92, 0.28), housingMat);
    back.position.y = 0.2;
    back.castShadow = true;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 1.88), faceMat);
    face.position.set(0, 0.2, 0.145);
    boardHolder.add(back, face);
  } else if (sign.shape === 'circle-prohibit' || sign.shape === 'circle-mandate') {
    const back = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 24), backMat);
    back.rotation.x = Math.PI / 2;
    back.castShadow = true;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), faceMat);
    face.position.z = 0.05;
    boardHolder.add(back, face);
  } else if (sign.shape === 'square-info') {
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.38, 1.38, 0.08), backMat);
    back.castShadow = true;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.38, 1.38), faceMat);
    face.position.z = 0.05;
    boardHolder.add(back, face);
  } else {
    // Tam giác cảnh báo 3D
    const triShape = new THREE.Shape();
    triShape.moveTo(0, 0.78);
    triShape.lineTo(0.76, -0.58);
    triShape.lineTo(-0.76, -0.58);
    triShape.closePath();
    const backGeo = new THREE.ExtrudeGeometry(triShape, {
      depth: 0.07,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2,
    });
    const back = new THREE.Mesh(backGeo, backMat);
    back.position.z = -0.04;
    back.castShadow = true;

    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.56, 1.56), faceMat);
    face.position.set(0, 0.06, 0.055);
    boardHolder.add(back, face);
  }

  group.add(boardHolder);
  return group;
}

// --- Mô hình 3D dành riêng cho bản đồ ngã rẽ (Nhà An, Cửa hàng, Trụ đèn, Cây cầu, Rào sửa chữa, Vòng đu quay & Cầu trượt) ---

function createAwningStripesTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const stripes = 8;
  const w = canvas.width / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#EF4444' : '#FFFFFF';
    ctx.fillRect(i * w, 0, w, canvas.height);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRoadworkTriangleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(128, 18);
  ctx.lineTo(236, 224);
  ctx.lineTo(20, 224);
  ctx.closePath();
  ctx.fillStyle = '#FACC15';
  ctx.fill();
  ctx.lineWidth = 22;
  ctx.strokeStyle = '#DC2626';
  ctx.stroke();

  // Hình người đang xúc đất (biển đường đang sửa chữa)
  ctx.fillStyle = '#0F172A';
  ctx.strokeStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(112, 118, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(114, 134);
  ctx.lineTo(126, 170);
  ctx.lineTo(106, 198);
  ctx.moveTo(126, 170);
  ctx.lineTo(146, 198);
  ctx.moveTo(116, 146);
  ctx.lineTo(156, 166);
  ctx.lineTo(176, 194);
  ctx.stroke();

  // Đống cát
  ctx.beginPath();
  ctx.moveTo(148, 202);
  ctx.quadraticCurveTo(174, 176, 198, 202);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createOrangeStripesTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#F97316';
  for (let x = -64; x < 320; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 64);
    ctx.lineTo(x + 24, 64);
    ctx.lineTo(x + 48, 0);
    ctx.lineTo(x + 24, 0);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createAnHouse3D(): THREE.Group {
  const group = new THREE.Group();
  group.add(createContactShadow(3.6, 3.0, 0.72));

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.55 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.72 });
  const winMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfde047,
    emissiveIntensity: 0.25,
    roughness: 0.25,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 2.0), wallMat);
  body.position.y = 0.75;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.05, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 2.02;
  roof.castShadow = true;
  group.add(roof);

  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.65, 0.32), roofMat);
  chimney.position.set(-0.55, 2.25, -0.25);
  chimney.castShadow = true;
  group.add(chimney);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.85, 0.1), woodMat);
  door.position.set(-0.55, 0.42, 1.02);
  group.add(door);

  [0.25, 0.78].forEach((x) => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.1), winMat);
    win.position.set(x, 0.85, 1.02);
    group.add(win);
  });

  // Hàng rào trắng xinh bên hông
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  [-1.6, -1.9, -2.2].forEach((x) => {
    const picket = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.1), fenceMat);
    picket.position.set(x, 0.26, 0.7);
    group.add(picket);
  });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.08), fenceMat);
  rail.position.set(-1.9, 0.32, 0.7);
  group.add(rail);

  return group;
}

export function createShop3D(): THREE.Group {
  const group = new THREE.Group();
  group.add(createContactShadow(3.2, 2.6, 0.72));

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.65 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.55 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.15,
    metalness: 0.2,
  });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.7 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.35, 1.85), wallMat);
  body.position.y = 0.68;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.26, 2.05), roofMat);
  roof.position.y = 1.48;
  roof.castShadow = true;
  group.add(roof);

  // Mái hiên sọc đỏ trắng
  const awningMat = new THREE.MeshStandardMaterial({
    map: createAwningStripesTexture(),
    roughness: 0.5,
  });
  const awning = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.16, 0.72), awningMat);
  awning.position.set(0, 1.18, 1.15);
  awning.rotation.x = 0.32;
  awning.castShadow = true;
  group.add(awning);

  const shopWindow = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.62, 0.1), glassMat);
  shopWindow.position.set(-0.48, 0.62, 0.94);
  group.add(shopWindow);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.88, 0.1), woodMat);
  door.position.set(0.55, 0.44, 0.94);
  group.add(door);

  return group;
}

export function createTrafficLightPole3D(): THREE.Group {
  const group = new THREE.Group();
  group.add(createContactShadow(1.1, 1.1, 0.7));

  const poleMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.3,
    metalness: 0.65,
  });
  const boxMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.45,
    metalness: 0.2,
  });

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.34, 0.2, 10),
    new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 })
  );
  base.position.y = 0.1;
  group.add(base);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.65, 10), poleMat);
  pole.position.y = 0.92;
  pole.castShadow = true;
  group.add(pole);

  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.48, 0.42), boxMat);
  housing.position.y = 2.25;
  housing.castShadow = true;
  group.add(housing);

  const lamps: Array<{ y: number; color: number; emissive: number }> = [
    { y: 2.68, color: 0xef4444, emissive: 0xdc2626 },
    { y: 2.25, color: 0xfacc15, emissive: 0xeab308 },
    { y: 1.82, color: 0x22c55e, emissive: 0x16a34a },
  ];
  lamps.forEach((l) => {
    const mat = new THREE.MeshStandardMaterial({
      color: l.color,
      emissive: l.emissive,
      emissiveIntensity: 0.65,
      roughness: 0.25,
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), mat);
    bulb.position.set(0, l.y, 0.2);
    group.add(bulb);
  });

  return group;
}

export function createBridgeAndRoadwork3D(): {
  bridge: THREE.Group;
  roadwork: THREE.Group;
} {
  // Cây cầu đá vòm bắc qua dòng sông
  const bridge = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.78 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.82 });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.28, 1.7), deckMat);
  deck.position.y = 0.48;
  deck.castShadow = true;
  deck.receiveShadow = true;
  bridge.add(deck);

  [-1.35, 1.35].forEach((x) => {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 1.72), stoneMat);
    pier.position.set(x, 0.25, 0);
    pier.castShadow = true;
    bridge.add(pier);
  });

  [-0.78, 0.78].forEach((z) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.36, 0.14), stoneMat);
    rail.position.set(0, 0.78, z);
    rail.castShadow = true;
    bridge.add(rail);
  });

  // Rào chắn & Biển báo đường đang sửa chữa
  const roadwork = new THREE.Group();
  roadwork.add(createContactShadow(2.2, 1.2, 0.65));

  const stripeMat = new THREE.MeshStandardMaterial({
    map: createOrangeStripesTexture(),
    roughness: 0.5,
  });
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });

  const board = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.38, 0.1), stripeMat);
  board.position.set(0, 0.65, 0);
  board.castShadow = true;
  roadwork.add(board);

  [-0.6, 0.6].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 0.14), legMat);
    leg.position.set(x, 0.42, 0);
    roadwork.add(leg);
  });

  [-0.95, 0.95].forEach((x) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 10), coneMat);
    cone.position.set(x, 0.28, 0.2);
    cone.castShadow = true;
    roadwork.add(cone);
  });

  // Biển báo tam giác vàng Đường đang sửa chữa phía trên rào chắn
  const warnTex = createRoadworkTriangleTexture();
  const warnMat = new THREE.MeshStandardMaterial({
    map: warnTex,
    transparent: true,
    alphaTest: 0.15,
    roughness: 0.38,
  });
  const signPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.6, roughness: 0.3 })
  );
  signPost.position.set(0, 0.8, -0.2);
  const signFace = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 1.08), warnMat);
  signFace.position.set(0, 1.52, -0.15);
  roadwork.add(signPost, signFace);

  return { bridge, roadwork };
}

export function createFerrisWheelAndSlide3D(): THREE.Group {
  const group = new THREE.Group();

  // Trụ đỡ Vòng đu quay
  const legMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.4 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.4 });
  const spokeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });

  [-0.65, 0.65].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 2.75, 8), legMat);
    leg.position.set(x, 1.25, 0);
    leg.rotation.z = x < 0 ? -0.24 : 0.24;
    leg.castShadow = true;
    group.add(leg);
  });

  const wheelGroup = new THREE.Group();
  wheelGroup.position.set(0, 2.45, 0.15);

  const outerRim = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.07, 8, 24), rimMat);
  wheelGroup.add(outerRim);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.24, 12),
    spokeMat
  );
  hub.rotation.x = Math.PI / 2;
  wheelGroup.add(hub);

  const cabColors = [0xef4444, 0xf59e0b, 0x22c55e, 0x38bdf8, 0xa855f7, 0xec4899, 0x14b8a6, 0xf97316];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.45, 0.05), spokeMat);
    spoke.position.set(Math.cos(angle) * 0.72, Math.sin(angle) * 0.72, 0);
    spoke.rotation.z = angle - Math.PI / 2;
    wheelGroup.add(spoke);

    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.34, 0.28),
      new THREE.MeshStandardMaterial({ color: cabColors[i], roughness: 0.4 })
    );
    cab.position.set(Math.cos(angle) * 1.45, Math.sin(angle) * 1.45, 0.1);
    cab.castShadow = true;
    wheelGroup.add(cab);
  }

  group.add(wheelGroup);
  group.userData.wheelGroup = wheelGroup;

  // Cầu trượt nhỏ đáng yêu bên cạnh vòng đu quay
  const slideGroup = new THREE.Group();
  slideGroup.position.set(1.85, 0, 0.9);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });
  const chuteMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.35 });

  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.05, 0.65), frameMat);
  tower.position.set(0, 0.52, 0);
  tower.castShadow = true;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.5, 4), new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 }));
  roof.rotation.y = Math.PI / 4;
  roof.position.set(0, 1.3, 0);
  const chute = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 1.35), chuteMat);
  chute.position.set(0, 0.45, 0.85);
  chute.rotation.x = 0.55;
  chute.castShadow = true;
  slideGroup.add(tower, roof, chute);

  group.add(slideGroup);

  return group;
}

