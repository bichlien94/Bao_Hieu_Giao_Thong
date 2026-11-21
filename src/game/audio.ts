// Bộ tổng hợp âm thanh bằng Web Audio API (không dùng file âm thanh ngoài)
import type { VehicleId } from './data';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  // Khởi tạo AudioContext sau tương tác đầu tiên của người dùng (quy định trình duyệt)
  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(value: boolean): void {
    this.muted = value;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (!this.muted) {
      this.unlock();
      this.playSelect();
    }
    return this.muted;
  }

  private getCtx(): AudioContext | null {
    if (this.muted) return null;
    this.unlock();
    return this.ctx;
  }

  // Tiếng chạm chọn nhẹ nhàng ("pop")
  public playSelect(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.08);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Tiếng còi xe "bíp bíp!"
  public playHorn(vehicleId: VehicleId = 'family'): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const pitchMap: Record<VehicleId, [number, number]> = {
      family: [440, 554],
      taxi: [494, 622],
      police: [659, 880],
      bus: [247, 311],
    };
    const [f1, f2] = pitchMap[vehicleId];

    [0, 0.15].forEach((offset) => {
      const start = now + offset;
      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      const gain = ctx.createGain();

      oscA.type = 'triangle';
      oscB.type = 'sine';
      oscA.frequency.setValueAtTime(f1, start);
      oscB.frequency.setValueAtTime(f2, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.13, start + 0.02);
      gain.gain.setValueAtTime(0.12, start + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

      oscA.connect(gain);
      oscB.connect(gain);
      gain.connect(ctx.destination);

      oscA.start(start);
      oscB.start(start);
      oscA.stop(start + 0.13);
      oscB.stop(start + 0.13);
    });
  }

  // Tiếng trả lời đúng ("ting-ting!" vui tươi)
  public playCorrect(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // Đô - Mi - Sol - Đô cao

    notes.forEach((freq, idx) => {
      const start = now + idx * 0.075;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.34);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }

  // Tiếng trả lời sai dịu nhẹ, thân thiện (không gắt)
  public playWrongGentle(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [330, 277.18];

    notes.forEach((freq, idx) => {
      const start = now + idx * 0.13;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.92, start + 0.14);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.19);
    });
  }

  // Tiếng xe tăng tốc vui nhộn
  public playBoost(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.28);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.34);
  }

  // Nhạc hiệu chiến thắng rộn ràng khi nhận bằng khen
  public playVictory(): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const melody: Array<[number, number, number]> = [
      [523.25, 0.0, 0.14],
      [659.25, 0.13, 0.14],
      [783.99, 0.26, 0.14],
      [1046.5, 0.4, 0.3],
      [783.99, 0.65, 0.14],
      [1046.5, 0.8, 0.52],
    ];

    melody.forEach(([freq, offset, dur]) => {
      const start = now + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.03);
    });
  }
}

export const soundEngine = new SoundEngine();
