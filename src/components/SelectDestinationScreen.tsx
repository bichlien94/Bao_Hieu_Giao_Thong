// Màn chọn điểm đến: Bản đồ thành phố mini 3D với 4 tòa nhà low-poly tương tác + nút LÊN XE XUẤT PHÁT
import { ArrowLeft, Check, MapPin, Rocket } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { soundEngine } from '../game/audio';
import { DESTINATIONS, type DestinationId } from '../game/data';
import { CityMapScene3D, type ProjectedBuildingLabel } from '../game/scenes/CityMapScene3D';
import { detectWebGLCapabilities } from '../game/scenes/webglDetect';

interface SelectDestinationScreenProps {
  selectedDestination: DestinationId;
  onSelectDestination: (id: DestinationId) => void;
  onBack: () => void;
  onStartDrive: () => void;
}

export function SelectDestinationScreen({
  selectedDestination,
  onSelectDestination,
  onBack,
  onStartDrive,
}: SelectDestinationScreenProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<CityMapScene3D | null>(null);
  const [labels, setLabels] = useState<ProjectedBuildingLabel[]>([]);
  const webglSupported = detectWebGLCapabilities().supported;

  const activeDest =
    DESTINATIONS.find((d) => d.id === selectedDestination) || DESTINATIONS[0];

  useEffect(() => {
    if (!webglSupported || !mapRef.current) return;

    const cityScene = new CityMapScene3D(
      mapRef.current,
      selectedDestination,
      (id) => {
        soundEngine.unlock();
        soundEngine.playSelect();
        onSelectDestination(id);
      },
      (projected) => {
        setLabels(projected);
      }
    );
    sceneRef.current = cityScene;

    return () => {
      cityScene.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webglSupported]);

  useEffect(() => {
    sceneRef.current?.setSelected(selectedDestination);
  }, [selectedDestination]);

  const handleLabelClick = (id: DestinationId) => {
    soundEngine.unlock();
    soundEngine.playSelect();
    onSelectDestination(id);
    sceneRef.current?.setSelected(id);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-[#7DD3FC] via-[#BAE6FD] to-[#DCFCE7]">
      {/* Vùng bản đồ thành phố mini 3D */}
      {webglSupported ? (
        <div ref={mapRef} className="absolute inset-0 h-full w-full" />
      ) : (
        <div className="mx-auto grid h-full max-w-3xl grid-cols-2 content-center gap-4 px-4 pt-20 pb-36">
          {DESTINATIONS.map((dest) => {
            const active = dest.id === selectedDestination;
            return (
              <button
                key={dest.id}
                type="button"
                onClick={() => handleLabelClick(dest.id)}
                className={`toy-card flex flex-col items-center p-4 text-center ${
                  active ? 'border-[#FFD93D] ring-4 ring-[#FFD93D]/70' : ''
                }`}
              >
                <span className="text-5xl">{dest.emoji}</span>
                <span className="mt-2 text-lg font-extrabold">{dest.shortName}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Nhãn HTML gắn theo vị trí 3D của 4 tòa nhà */}
      {webglSupported &&
        labels.map((lbl) => {
          if (!lbl.visible) return null;
          const dest = DESTINATIONS.find((d) => d.id === lbl.id);
          if (!dest) return null;
          const isSelected = lbl.id === selectedDestination;

          return (
            <button
              key={lbl.id}
              type="button"
              onClick={() => handleLabelClick(lbl.id)}
              style={{
                left: `${lbl.x}px`,
                top: `${lbl.y}px`,
                transform: 'translate(-50%, -100%)',
              }}
              className={`absolute z-20 flex items-center gap-1.5 rounded-full border-[3px] px-3.5 py-1.5 text-base font-extrabold whitespace-nowrap transition-transform active:scale-95 sm:text-lg ${
                isSelected
                  ? 'border-amber-600 bg-[#FFD93D] text-amber-950 shadow-[0_4px_0_#D97706] ring-4 ring-white'
                  : 'border-slate-300 bg-white/95 text-slate-800 shadow-[0_4px_0_#94A3B8]'
              }`}
            >
              <span aria-hidden="true">{dest.emoji}</span>
              <span>{dest.shortName}</span>
              {isSelected && <Check className="h-5 w-5 text-emerald-700 stroke-[3]" />}
            </button>
          );
        })}

      {/* Thanh tiêu đề trên cùng */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3 pt-3 sm:px-6 sm:pt-4">
        <button
          type="button"
          onClick={() => {
            soundEngine.playSelect();
            onBack();
          }}
          className="toy-btn toy-btn-white pointer-events-auto min-h-[48px] px-3.5 py-2 text-base"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="hidden sm:inline">Đổi xe</span>
        </button>

        <div className="toy-card pointer-events-auto bg-white/95 px-4 py-2 text-center shadow-[0_5px_0_rgba(15,23,42,0.12)]">
          <h2 className="flex items-center justify-center gap-2 text-lg font-extrabold text-slate-800 sm:text-2xl">
            <MapPin className="h-5 w-5 text-[#FF5A5F] sm:h-6 sm:w-6" />
            <span>Chạm Tòa Nhà Để Chọn Điểm Đến</span>
          </h2>
        </div>

        <div className="w-14 sm:w-24" />
      </div>

      {/* Thanh đáy hiển thị điểm đến đã chọn + nút LÊN XE XUẤT PHÁT */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center px-3 pb-4 sm:pb-5">
        <div className="toy-card pointer-events-auto flex w-full max-w-2xl flex-col items-center justify-between gap-3 bg-white/95 px-4 py-3 sm:flex-row sm:px-5">
          <div className="flex items-center gap-3 text-left">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-3xl">
              {activeDest.emoji}
            </span>
            <div>
              <div className="text-lg font-extrabold text-slate-800 sm:text-xl">
                {activeDest.name}
              </div>
              <div className="text-sm font-semibold text-slate-500">
                {activeDest.description}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.unlock();
              soundEngine.playBoost();
              onStartDrive();
            }}
            className="toy-btn toy-btn-green animate-cta-breathe w-full shrink-0 text-xl sm:w-auto"
          >
            <Rocket className="h-6 w-6" />
            <span>LÊN XE XUẤT PHÁT</span>
          </button>
        </div>
      </div>
    </div>
  );
}
