// Màn chọn xe: 4 mẫu xe 3D xoay chậm, chạm vào nảy lên + bấm còi "bíp bíp" + viền sáng & dấu ✓
import { ArrowRight, Check, Volume2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { soundEngine } from '../game/audio';
import { VEHICLES, type VehicleId } from '../game/data';
import { VehicleShowcase3D } from '../game/scenes/VehicleShowcase3D';
import { detectWebGLCapabilities } from '../game/scenes/webglDetect';

interface SelectVehicleScreenProps {
  childName: string;
  selectedVehicle: VehicleId;
  onSelectVehicle: (id: VehicleId) => void;
  onNext: () => void;
}

export function SelectVehicleScreen({
  childName,
  selectedVehicle,
  onSelectVehicle,
  onNext,
}: SelectVehicleScreenProps) {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef<Record<VehicleId, HTMLDivElement | null>>({
    family: null,
    taxi: null,
    police: null,
    bus: null,
  });
  const showcaseRef = useRef<VehicleShowcase3D | null>(null);
  const webglSupported = detectWebGLCapabilities().supported;

  useEffect(() => {
    if (!webglSupported || !canvasHostRef.current) return;
    const f = slotRefs.current.family;
    const t = slotRefs.current.taxi;
    const p = slotRefs.current.police;
    const b = slotRefs.current.bus;
    if (!f || !t || !p || !b) return;

    const showcase = new VehicleShowcase3D(
      canvasHostRef.current,
      { family: f, taxi: t, police: p, bus: b },
      selectedVehicle
    );
    showcaseRef.current = showcase;

    return () => {
      showcase.dispose();
      showcaseRef.current = null;
    };
    // Khởi tạo một lần khi vào màn chọn xe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webglSupported]);

  useEffect(() => {
    showcaseRef.current?.setSelected(selectedVehicle);
  }, [selectedVehicle]);

  const handlePick = (id: VehicleId) => {
    soundEngine.unlock();
    soundEngine.playHorn(id);
    onSelectVehicle(id);
    showcaseRef.current?.setSelected(id);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-y-auto bg-gradient-to-b from-[#7DD3FC] via-[#BAE6FD] to-[#DCFCE7] px-3 py-4 sm:px-6 sm:py-5">
      {/* Canvas 3D dùng chung vẽ trực tiếp vào 4 ô xe (pointer-events-none để không cản click) */}
      {webglSupported && (
        <div
          ref={canvasHostRef}
          className="pointer-events-none fixed inset-0 z-20 h-full w-full"
        />
      )}

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col justify-between gap-3">
        {/* Tiêu đề */}
        <div className="text-center">
          <div className="inline-block rounded-full border-2 border-sky-500 bg-white/95 px-4 py-1 text-base font-extrabold text-sky-700 shadow-sm">
            Bác tài nhí: <span className="text-[#FF5A5F]">{childName}</span>
          </div>
          <h2 className="mt-1.5 text-2xl font-extrabold text-slate-800 sm:text-3xl">
            Chọn Chiếc Xe Yêu Thích Nhé!
          </h2>
          <p className="text-base font-semibold text-slate-600">
            Chạm vào xe để nghe tiếng còi &ldquo;Bíp bíp!&rdquo;
          </p>
        </div>

        {/* Lưới 4 xe */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {VEHICLES.map((v) => {
            const isSelected = selectedVehicle === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => handlePick(v.id)}
                className={`relative flex flex-col items-center rounded-[24px] border-[3px] p-3 text-center transition-transform active:translate-y-1 ${
                  isSelected
                    ? 'border-[#FFD93D] bg-amber-50/90 shadow-[0_8px_0_#D97706] ring-4 ring-[#FFD93D]/70'
                    : 'border-white/95 bg-white/85 shadow-[0_6px_0_rgba(15,23,42,0.14)] hover:bg-white'
                }`}
              >
                {/* Huy hiệu dấu tích khi chọn */}
                {isSelected && (
                  <span className="absolute -top-2.5 -right-2.5 z-30 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-[#6BCB77] text-white shadow-md">
                    <Check className="h-5 w-5 stroke-[3]" />
                  </span>
                )}

                {/* Khung 3D Scissor Viewport (hoặc emoji dự phòng 2D) */}
                <div
                  ref={(el) => {
                    slotRefs.current[v.id] = el;
                  }}
                  className="flex h-28 w-full items-center justify-center sm:h-36"
                >
                  {!webglSupported && (
                    <span className="text-6xl" aria-hidden="true">
                      {v.emoji}
                    </span>
                  )}
                </div>

                {/* Thông tin xe */}
                <div className="relative z-30 mt-1 w-full rounded-2xl bg-white px-2 py-2 shadow-sm">
                  <div className="flex items-center justify-center gap-1.5 text-lg font-extrabold text-slate-800">
                    <span>{v.name}</span>
                    <Volume2 className="h-4 w-4 text-sky-500" />
                  </div>
                  <p className="mt-0.5 text-sm leading-snug font-semibold text-slate-500">
                    {v.tagline}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Nút tiếp tục */}
        <div className="flex justify-center pt-1 pb-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playSelect();
              onNext();
            }}
            className="toy-btn toy-btn-sun animate-cta-breathe w-full max-w-sm text-xl"
          >
            <span>TIẾP THEO: CHỌN ĐIỂM ĐẾN</span>
            <ArrowRight className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
