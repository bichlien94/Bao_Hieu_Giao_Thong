// Hiệu ứng Confetti + Sao bay trên canvas 2D phủ lên (không dùng ảnh ngoài)
import { useEffect, useRef } from 'react';

interface ConfettiOverlayProps {
  burstKey: number;
  continuous?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vRot: number;
  isStar: boolean;
  life: number;
  maxLife: number;
}

const COLORS = ['#FFD93D', '#FF5A5F', '#6BCB77', '#7DD3FC', '#FF8A3D', '#A78BFA'];

function drawStar(
  ctx: CanvasRenderingContext2D,
  r: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    const innerAngle = outerAngle + Math.PI / 5;
    const ox = Math.cos(outerAngle) * r;
    const oy = Math.sin(outerAngle) * r;
    const ix = Math.cos(innerAngle) * (r * 0.45);
    const iy = Math.sin(innerAngle) * (r * 0.45);
    if (i === 0) ctx.moveTo(ox, oy);
    else ctx.lineTo(ox, oy);
    ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  ctx.fill();
}

export function ConfettiOverlay({ burstKey, continuous = false }: ConfettiOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = window.innerWidth;
    const h = window.innerHeight;

    const spawnBurst = (count: number) => {
      for (let i = 0; i < count; i++) {
        const fromLeft = i % 2 === 0;
        particlesRef.current.push({
          x: fromLeft ? w * (0.2 + Math.random() * 0.25) : w * (0.55 + Math.random() * 0.25),
          y: continuous ? -20 - Math.random() * 140 : h * (0.35 + Math.random() * 0.2),
          vx: (Math.random() - 0.5) * 380,
          vy: continuous ? 140 + Math.random() * 180 : -240 - Math.random() * 340,
          size: 7 + Math.random() * 8,
          color: COLORS[i % COLORS.length],
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 9,
          isStar: i % 3 === 0,
          life: 0,
          maxLife: continuous ? 4.0 : 2.1 + Math.random() * 0.8,
        });
      }
    };

    if (burstKey > 0 || continuous) {
      spawnBurst(continuous ? 75 : 55);
    }
  }, [burstKey, continuous]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const list = particlesRef.current;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.life += dt;
        p.vy += 420 * dt; // Trọng lực rơi nhẹ
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vRot * dt;

        if (p.life >= p.maxLife || p.y > h + 40) {
          list.splice(i, 1);
          continue;
        }

        const alpha = Math.max(0, 1 - Math.pow(p.life / p.maxLife, 2));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.isStar) {
          drawStar(ctx, p.size, p.color);
        } else {
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, (p.size * 2) / 3);
        }
        ctx.restore();
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="no-print pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}
