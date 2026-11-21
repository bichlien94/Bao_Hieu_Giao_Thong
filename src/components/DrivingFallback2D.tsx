// Chế độ dự phòng 2D giả phối cảnh nếu trình duyệt/thiết bị không hỗ trợ WebGL
import { useEffect, useRef } from 'react';
import type { TrafficSignQuestion, VehicleId } from '../game/data';
import { VEHICLES } from '../game/data';

interface DrivingFallback2DProps {
  vehicleId: VehicleId;
  activeSign: TrafficSignQuestion | null;
  signState: 'approaching' | 'stopped' | 'boosting' | 'cruise';
  onReachSign?: () => void;
}

export function DrivingFallback2D({
  vehicleId,
  activeSign,
  signState,
  onReachSign,
}: DrivingFallback2DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef(0);
  const reachedRef = useRef(false);

  useEffect(() => {
    progressRef.current = 0;
    reachedRef.current = false;
  }, [activeSign?.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let offset = 0;
    let last = performance.now();

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const vehicle = VEHICLES.find((v) => v.id === vehicleId) || VEHICLES[0];

    const render = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const w = canvas.width;
      const h = canvas.height;
      const horizonY = h * 0.42;

      const speed =
        signState === 'stopped' ? 0 : signState === 'boosting' ? 2.4 : 1.1;
      offset = (offset + dt * speed * 120) % 80;

      if (signState === 'approaching' && activeSign) {
        progressRef.current = Math.min(1, progressRef.current + dt * 0.42);
        if (progressRef.current >= 1 && !reachedRef.current) {
          reachedRef.current = true;
          onReachSign?.();
        }
      }

      // Bầu trời
      const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
      sky.addColorStop(0, '#38BDF8');
      sky.addColorStop(1, '#CBEAFE');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, horizonY);

      // Mặt trời
      ctx.fillStyle = '#FFD93D';
      ctx.beginPath();
      ctx.arc(w * 0.16, h * 0.16, 36, 0, Math.PI * 2);
      ctx.fill();

      // Cỏ xanh
      ctx.fillStyle = '#6BCB77';
      ctx.fillRect(0, horizonY, w, h - horizonY);

      // Đường phối cảnh 2D
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(w * 0.43, horizonY);
      ctx.lineTo(w * 0.57, horizonY);
      ctx.lineTo(w * 0.88, h);
      ctx.lineTo(w * 0.12, h);
      ctx.closePath();
      ctx.fill();

      // Vạch vàng giữa đường
      ctx.fillStyle = '#FACC15';
      for (let i = 0; i < 6; i++) {
        const t = ((i * 80 + offset) % 480) / 480;
        const y = horizonY + t * (h - horizonY);
        const segH = 12 + t * 28;
        const segW = 4 + t * 10;
        ctx.fillRect(w * 0.5 - segW / 2, y, segW, segH);
      }

      // Biển báo 2D bên lề phải
      if (activeSign && signState !== 'cruise') {
        const p = signState === 'boosting' ? 1.15 : progressRef.current;
        const sx = w * (0.62 + p * 0.16);
        const sy = horizonY + p * (h * 0.25);
        const scale = 0.35 + p * 0.85;

        ctx.fillStyle = '#CBD5E1';
        ctx.fillRect(sx - 4 * scale, sy, 8 * scale, 70 * scale);
        if (activeSign.shape === 'rectangle-signal') {
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(sx - 18 * scale, sy - 38 * scale, 36 * scale, 72 * scale);
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.arc(sx, sy - 20 * scale, 8 * scale, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle =
            activeSign.shape === 'triangle-warn'
              ? '#FACC15'
              : activeSign.shape === 'circle-mandate' || activeSign.shape === 'square-info'
                ? '#0284C7'
                : '#DC2626';
          ctx.beginPath();
          ctx.arc(sx, sy, 28 * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 4 * scale;
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();
        }
      }

      // Xe nhìn từ phía sau ở giữa đường
      const cx = w * 0.5;
      const cy = h * 0.82;
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(cx - 58, cy + 12, 22, 20);
      ctx.fillRect(cx + 36, cy + 12, 22, 20);
      ctx.fillStyle = vehicle.primaryColor;
      ctx.beginPath();
      ctx.roundRect(cx - 64, cy - 36, 128, 56, 16);
      ctx.fill();
      ctx.fillStyle = '#BAE6FD';
      ctx.beginPath();
      ctx.roundRect(cx - 44, cy - 64, 88, 34, 12);
      ctx.fill();

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [vehicleId, activeSign, signState, onReachSign]);

  return <canvas ref={canvasRef} className="fixed inset-0 h-full w-full" />;
}
