// Màn đầu: Nhập tên bé trên nền thế giới lái xe 3D sống động
import { Play, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { soundEngine } from '../game/audio';

interface TitleScreenProps {
  initialName: string;
  onStart: (childName: string) => void;
}

export function TitleScreen({ initialName, onStart }: TitleScreenProps) {
  const [nameInput, setNameInput] = useState(
    initialName === 'Bạn nhỏ' ? '' : initialName
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    soundEngine.unlock();
    soundEngine.playSelect();
    const trimmed = nameInput.trim().slice(0, 20);
    onStart(trimmed || 'Bạn nhỏ');
  };

  const handleSkip = () => {
    soundEngine.unlock();
    soundEngine.playSelect();
    onStart('Bạn nhỏ');
  };

  return (
    <div className="pointer-events-auto relative z-20 flex h-full w-full flex-col items-center justify-center px-4 py-6">
      <div className="w-full max-w-lg text-center">
        {/* Biểu trưng SVG + Tiêu đề game */}
        <div className="animate-gentle-bob mx-auto mb-4 inline-flex flex-col items-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border-2 border-amber-500 bg-[#FFD93D] px-4 py-1 text-base font-extrabold text-amber-950 shadow-[0_4px_0_#D97706]">
            <Sparkles className="h-5 w-5" />
            <span>HỌC BIỂN BÁO GIAO THÔNG 3D</span>
          </div>

          <div className="toy-card bg-white/95 px-6 py-4 shadow-[0_8px_0_rgba(2,132,199,0.28)]">
            <div className="flex items-center justify-center gap-3">
              {/* Biểu tượng vô lăng SVG tùy chỉnh */}
              <svg
                viewBox="0 0 64 64"
                className="h-14 w-14 shrink-0"
                aria-hidden="true"
              >
                <circle cx="32" cy="32" r="28" fill="#FF8A3D" stroke="#9A3412" strokeWidth="4" />
                <circle cx="32" cy="32" r="18" fill="#FEF3C7" stroke="#9A3412" strokeWidth="3" />
                <rect x="14" y="29" width="36" height="6" rx="3" fill="#334155" />
                <rect x="29" y="32" width="6" height="19" rx="3" fill="#334155" />
                <circle cx="32" cy="32" r="7" fill="#FFD93D" stroke="#9A3412" strokeWidth="3" />
              </svg>
              <h1 className="text-left text-3xl leading-tight font-extrabold tracking-tight text-slate-800 sm:text-4xl">
                Bé Lái Xe
                <span className="block text-[#0284C7]">Khám Phá</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Thẻ nhập tên bé */}
        <form
          onSubmit={handleSubmit}
          className="toy-card mx-auto mt-2 bg-white/95 p-5 sm:p-6"
        >
          <label
            htmlFor="child-name-input"
            className="mb-2 block text-left text-lg font-extrabold text-slate-700"
          >
            Xin chào bác tài nhí!
          </label>
          <input
            id="child-name-input"
            type="text"
            maxLength={20}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Bé tên là gì nhỉ?"
            className="w-full rounded-2xl border-[3px] border-sky-300 bg-sky-50/70 px-4 py-3 text-xl font-bold text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none"
          />
          <div className="mt-1.5 flex items-center justify-between text-sm font-semibold text-slate-500">
            <span>Tên sẽ được in lên Bằng Khen của bé</span>
            <span>{nameInput.length}/20</span>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <button
              type="submit"
              className="toy-btn toy-btn-green animate-cta-breathe w-full text-xl"
            >
              <Play className="h-6 w-6 fill-current" />
              <span>BẮT ĐẦU CHỌN XE</span>
            </button>

            <button
              type="button"
              onClick={handleSkip}
              className="toy-btn toy-btn-white w-full text-base"
            >
              Bỏ qua, gọi bé là &ldquo;Bạn nhỏ&rdquo;
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
