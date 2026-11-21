// Giao diện HUD phủ lên cảnh lái xe 3D: Đường đua tiến trình, Huy hiệu sao, Hộp câu hỏi bo góc lớn
import { CarFront, Megaphone, Star, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { soundEngine } from '../game/audio';
import {
  DESTINATIONS,
  getShapeQuestionForSign,
  VEHICLES,
  type DestinationId,
  type TrafficSignQuestion,
  type VehicleId,
} from '../game/data';
import { drawTrafficSignToCanvas } from '../game/models3d';

function SignPreview({ sign }: { sign: TrafficSignQuestion }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      drawTrafficSignToCanvas(canvasRef.current, sign.shape, sign.art);
    }
  }, [sign.id, sign.shape, sign.art]);

  const isRect = sign.shape === 'rectangle-signal';

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-2xl bg-slate-100/80 px-2.5 py-2"
      aria-label={sign.name}
    >
      <canvas
        ref={canvasRef}
        className={`block drop-shadow-md ${
          isRect ? 'h-20 w-10 sm:h-24 sm:w-12' : 'h-20 w-20 sm:h-24 sm:w-24'
        }`}
      />
    </div>
  );
}

interface DrivingHUDProps {
  childName: string;
  vehicleId: VehicleId;
  destinationId: DestinationId;
  score: number;
  scorePopKey: number;
  currentSignIndex: number; // 0..3
  passedCount: number; // 0..4
  phase: 'driving' | 'question' | 'celebrating';
  questionStage: 'shape' | 'meaning';
  currentSign: TrafficSignQuestion;
  feedback: { type: 'wrong' | 'correct'; message: string } | null;
  shakeKey: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onSelectAnswer: (optionIdx: number) => void;
}

const OPTION_STYLES = [
  'toy-btn-sky',
  'toy-btn-sun',
  'toy-btn-orange',
  'toy-btn-purple',
] as const;

export function DrivingHUD({
  childName,
  vehicleId,
  destinationId,
  score,
  scorePopKey,
  currentSignIndex,
  passedCount,
  phase,
  questionStage,
  currentSign,
  feedback,
  shakeKey,
  isMuted,
  onToggleMute,
  onSelectAnswer,
}: DrivingHUDProps) {
  const [poppingScore, setPoppingScore] = useState(false);
  const [shakingCard, setShakingCard] = useState(false);

  const vehicle = VEHICLES.find((v) => v.id === vehicleId) || VEHICLES[0];
  const destination =
    DESTINATIONS.find((d) => d.id === destinationId) || DESTINATIONS[0];
  const shapePrompt = getShapeQuestionForSign(currentSign);
  const activeQuestionText =
    questionStage === 'shape' ? shapePrompt.question : currentSign.question;
  const activeOptions =
    questionStage === 'shape' ? shapePrompt.options : currentSign.options;
  const isTransitioningCorrect = feedback?.type === 'correct';

  useEffect(() => {
    if (scorePopKey > 0) {
      setPoppingScore(true);
      const t = window.setTimeout(() => setPoppingScore(false), 600);
      return () => clearTimeout(t);
    }
  }, [scorePopKey]);

  useEffect(() => {
    if (shakeKey > 0) {
      setShakingCard(true);
      const t = window.setTimeout(() => setShakingCard(false), 480);
      return () => clearTimeout(t);
    }
  }, [shakeKey]);

  // Phần trăm tiến trình xe chạy trên thanh đường đua
  const carProgressPct = Math.min(
    94,
    phase === 'question'
      ? 14 + currentSignIndex * 22
      : 6 + passedCount * 22
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-4">
      {/* HÀNG TRÊN CÙNG: Thông tin + Thanh đường đua + Điểm ngôi sao + Âm thanh */}
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          {/* Huy hiệu tên bé & nút còi xe */}
          <div className="pointer-events-auto flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border-[3px] border-white bg-white/95 px-3 py-1.5 shadow-[0_4px_0_rgba(15,23,42,0.14)]">
              <span className="text-xl" aria-hidden="true">
                {vehicle.emoji}
              </span>
              <span className="max-w-[110px] truncate text-base font-extrabold text-slate-800 sm:max-w-none sm:text-lg">
                {childName}
              </span>
            </div>

            <button
              type="button"
              onClick={() => soundEngine.playHorn(vehicleId)}
              title="Bấm còi xe"
              aria-label="Bấm còi xe"
              className="toy-btn toy-btn-sun min-h-[46px] rounded-full px-3 py-1.5 text-base"
            >
              <Megaphone className="h-5 w-5" />
              <span className="hidden sm:inline">Còi</span>
            </button>
          </div>

          {/* Điểm thưởng ngôi sao & Nút âm thanh */}
          <div className="pointer-events-auto flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 rounded-full border-[3px] border-amber-500 bg-[#FFD93D] px-3.5 py-1.5 text-amber-950 shadow-[0_4px_0_#D97706] ${
                poppingScore ? 'animate-score-pop' : ''
              }`}
            >
              <Star className="h-6 w-6 fill-amber-600 text-amber-700" />
              <span className="text-xl font-extrabold tabular-nums">{score}</span>
            </div>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              className="toy-btn toy-btn-white min-h-[46px] rounded-full px-3 py-1.5"
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5 text-slate-500" />
              ) : (
                <Volume2 className="h-5 w-5 text-sky-600" />
              )}
            </button>
          </div>
        </div>

        {/* THANH TIẾN TRÌNH DẠNG ĐƯỜNG ĐUA (4 mốc biển báo -> Điểm đến) */}
        <div className="mx-auto w-full max-w-2xl rounded-full border-[3px] border-white bg-white/95 px-4 py-2 shadow-[0_5px_0_rgba(15,23,42,0.12)]">
          <div className="relative flex h-9 items-center">
            {/* Nền đường đua */}
            <div className="h-3.5 w-full rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6BCB77] to-[#38BDF8] transition-all duration-500"
                style={{ width: `${carProgressPct}%` }}
              />
            </div>

            {/* Xe nhỏ chạy dọc đường đua */}
            <div
              className="absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
              style={{ left: `${carProgressPct}%` }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-sky-700 bg-sky-500 text-white shadow">
                <CarFront className="h-5 w-5" />
              </div>
            </div>

            {/* 4 mốc biển báo */}
            {[0, 1, 2, 3].map((idx) => {
              const leftPct = 20 + idx * 20;
              const isPassed = idx < passedCount;
              const isCurrent = idx === currentSignIndex && phase === 'question';
              return (
                <div
                  key={idx}
                  style={{ left: `${leftPct}%` }}
                  className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-extrabold transition-colors ${
                      isPassed
                        ? 'border-emerald-700 bg-[#6BCB77] text-white'
                        : isCurrent
                          ? 'border-amber-600 bg-[#FFD93D] text-amber-950'
                          : 'border-slate-300 bg-white text-slate-500'
                    }`}
                  >
                    {isPassed ? '⭐' : idx + 1}
                  </div>
                </div>
              );
            })}

            {/* Icon điểm đến ở cuối đường đua */}
            <div
              className="absolute right-0 top-1/2 z-10 -translate-y-1/2"
              title={destination.name}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-600 bg-emerald-100 text-lg shadow-sm">
                {destination.emoji}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* THÔNG BÁO KHI ĐANG CHẠY TỚI BIỂN BÁO */}
      {phase === 'driving' && (
        <div className="mx-auto mb-3 flex items-center gap-2 rounded-full border-[3px] border-white bg-white/95 px-5 py-2 text-lg font-extrabold text-slate-700 shadow-[0_5px_0_rgba(15,23,42,0.12)]">
          <span>🚦</span>
          <span>
            Đang lái xe tới biển báo {currentSignIndex + 1}/4 hướng về{' '}
            <span className="text-[#0284C7]">{destination.shortName}</span>...
          </span>
        </div>
      )}

      {/* HỘP CÂU HỎI BO GÓC LỚN KHI DỪNG TRƯỚC BIỂN BÁO 3D */}
      {(phase === 'question' || phase === 'celebrating') && (
        <div className="pointer-events-auto mx-auto w-full max-w-3xl pb-1">
          <div
            className={`toy-card bg-white/95 p-3.5 sm:p-5 ${
              shakingCard ? 'animate-gentle-shake' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-0.5 text-sm font-extrabold text-sky-800 sm:text-base">
                    Biển báo {currentSignIndex + 1}/4
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-0.5 text-sm font-extrabold sm:text-base ${
                      questionStage === 'shape'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-purple-100 text-purple-900'
                    }`}
                  >
                    {questionStage === 'shape'
                      ? 'Bước 1/2: Nhận biết hình dạng'
                      : 'Bước 2/2: Công dụng biển báo'}
                  </span>
                  {phase === 'celebrating' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-0.5 text-sm font-extrabold text-emerald-800 sm:text-base">
                      🎉 {currentSign.name}
                    </span>
                  )}
                </div>

                <h3 className="text-lg leading-snug font-extrabold text-slate-800 sm:text-2xl">
                  {activeQuestionText}
                </h3>
              </div>

              {/* Hình biển báo phóng to rõ nét ngay cạnh câu hỏi */}
              <SignPreview sign={currentSign} />
            </div>

            {/* Phản hồi khen ngợi hoặc gợi ý dịu nhẹ */}
            {feedback && (
              <div
                className={`mt-2.5 rounded-2xl border-2 px-3.5 py-2 text-base font-bold sm:text-lg ${
                  feedback.type === 'correct'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                    : 'border-amber-400 bg-amber-50 text-amber-950'
                }`}
              >
                {feedback.message}
              </div>
            )}

            {/* 4 nút đáp án to, mỗi nút một màu */}
            {phase === 'question' && !isTransitioningCorrect && (
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {activeOptions.map((opt, idx) => (
                  <button
                    key={`${questionStage}-${idx}`}
                    type="button"
                    onClick={() => onSelectAnswer(idx)}
                    className={`toy-btn ${OPTION_STYLES[idx % OPTION_STYLES.length]} w-full justify-start text-left text-base sm:text-lg`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/85 text-base font-extrabold text-slate-800">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="leading-snug">{opt}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
