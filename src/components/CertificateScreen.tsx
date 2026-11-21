// Màn tổng kết: Bằng khen Bác tài nhí (HTML/CSS/SVG + In bằng khen riêng)
import { Award, Printer, RotateCcw, Star } from 'lucide-react';
import { useEffect } from 'react';
import { soundEngine } from '../game/audio';
import {
  calculateStars,
  DESTINATIONS,
  formatVietnameseDate,
  VEHICLES,
  type DestinationId,
  type VehicleId,
} from '../game/data';

interface CertificateScreenProps {
  childName: string;
  vehicleId: VehicleId;
  destinationId: DestinationId;
  score: number;
  firstTryCorrectCount: number;
  totalDistanceKm: number;
  onPlayAgain: () => void;
}

export function CertificateScreen({
  childName,
  vehicleId,
  destinationId,
  score,
  firstTryCorrectCount,
  totalDistanceKm,
  onPlayAgain,
}: CertificateScreenProps) {
  const vehicle = VEHICLES.find((v) => v.id === vehicleId) || VEHICLES[0];
  const destination =
    DESTINATIONS.find((d) => d.id === destinationId) || DESTINATIONS[0];
  const starsEarned = calculateStars(firstTryCorrectCount);
  const todayStr = formatVietnameseDate();

  useEffect(() => {
    soundEngine.playVictory();
  }, []);

  return (
    <div className="print-only-wrap relative flex h-full w-full flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-[#7DD3FC] via-[#BAE6FD] to-[#FEF3C7] px-3 py-4 sm:px-6">
      {/* Tấm Bằng Khen */}
      <div className="certificate-sheet relative w-full max-w-3xl rounded-[28px] border-[6px] border-[#D97706] bg-gradient-to-b from-[#FFFDF5] to-[#FEF9C3] p-4 shadow-[0_12px_0_rgba(180,83,9,0.28)] sm:p-7">
        {/* Khung viền vàng trang trí bên trong */}
        <div className="relative rounded-[20px] border-[3px] border-dashed border-[#F59E0B] bg-white/85 px-4 py-5 text-center sm:px-8 sm:py-6">
          {/* Họa tiết góc SVG */}
          <svg
            className="pointer-events-none absolute top-2 left-2 h-8 w-8 text-amber-500"
            viewBox="0 0 32 32"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M2 2h14v4H6v10H2V2z" />
          </svg>
          <svg
            className="pointer-events-none absolute top-2 right-2 h-8 w-8 text-amber-500"
            viewBox="0 0 32 32"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M30 2H16v4h10v10h4V2z" />
          </svg>
          <svg
            className="pointer-events-none absolute bottom-2 left-2 h-8 w-8 text-amber-500"
            viewBox="0 0 32 32"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M2 30h14v-4H6V16H2v14z" />
          </svg>
          <svg
            className="pointer-events-none absolute right-2 bottom-2 h-8 w-8 text-amber-500"
            viewBox="0 0 32 32"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M30 30H16v-4h10V16h4v14z" />
          </svg>

          {/* Huy chương / Cúp vàng & Ngôi sao xoay */}
          <div className="relative mx-auto mb-2 flex w-fit items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-amber-500 bg-[#FFD93D] shadow-md sm:h-20 sm:w-20">
              <Award className="h-10 w-10 text-amber-900 sm:h-12 sm:w-12" />
            </div>
            <Star className="animate-star-spin absolute -top-2 -right-3 h-7 w-7 fill-[#FF8A3D] text-amber-700" />
          </div>

          <div className="text-sm font-extrabold tracking-wider text-amber-700 uppercase">
            Chứng nhận hoàn thành xuất sắc
          </div>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-[#B45309] sm:text-4xl">
            BẰNG KHEN BÁC TÀI NHÍ
          </h1>

          {/* Tên bé in lớn */}
          <div className="my-2.5 inline-block rounded-2xl border-2 border-amber-300 bg-amber-50/90 px-6 py-1.5">
            <span className="text-2xl font-extrabold text-[#FF5A5F] sm:text-4xl">
              {childName}
            </span>
          </div>

          <p className="mx-auto max-w-xl text-base font-bold text-slate-700 sm:text-lg">
            {destination.arrivalMsg}
          </p>

          {/* Số sao đạt được (1-3 sao) */}
          <div className="my-3 flex items-center justify-center gap-3">
            {[1, 2, 3].map((idx) => {
              const earned = idx <= starsEarned;
              return (
                <Star
                  key={idx}
                  className={`h-9 w-9 sm:h-11 sm:w-11 ${
                    earned
                      ? 'fill-[#FFD93D] text-amber-600 drop-shadow-sm'
                      : 'fill-slate-200 text-slate-300'
                  }`}
                />
              );
            })}
          </div>

          {/* 3 thẻ chỉ số */}
          <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-4">
            <div className="rounded-2xl border-2 border-amber-300 bg-[#FFFBEB] p-2.5 sm:p-3">
              <div className="text-xs font-bold text-amber-800 sm:text-sm">
                Điểm thưởng
              </div>
              <div className="mt-0.5 text-xl font-extrabold text-amber-700 tabular-nums sm:text-2xl">
                {score} ⭐
              </div>
            </div>

            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-2.5 sm:p-3">
              <div className="text-xs font-bold text-emerald-800 sm:text-sm">
                Biển báo đúng
              </div>
              <div className="mt-0.5 text-xl font-extrabold text-emerald-700 tabular-nums sm:text-2xl">
                {firstTryCorrectCount}/4 🚦
              </div>
            </div>

            <div className="rounded-2xl border-2 border-sky-300 bg-sky-50 p-2.5 sm:p-3">
              <div className="text-xs font-bold text-sky-800 sm:text-sm">
                Quãng đường
              </div>
              <div className="mt-0.5 text-xl font-extrabold text-sky-700 tabular-nums sm:text-2xl">
                {totalDistanceKm} km 🛣️
              </div>
            </div>
          </div>

          {/* Thông tin xe, điểm đến và ngày cấp */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t-2 border-amber-200 pt-3 text-sm font-bold text-slate-600 sm:text-base">
            <span>
              Phương tiện: {vehicle.emoji} {vehicle.name}
            </span>
            <span>
              Điểm đến: {destination.emoji} {destination.shortName}
            </span>
            <span>{todayStr}</span>
          </div>
        </div>
      </div>

      {/* Nút hành động (ẩn khi in) */}
      <div className="no-print mt-4 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            soundEngine.playSelect();
            onPlayAgain();
          }}
          className="toy-btn toy-btn-green flex-1 text-lg sm:text-xl"
        >
          <RotateCcw className="h-5 w-5" />
          <span>Lái Xe Chuyến Đi Mới</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundEngine.playSelect();
            window.print();
          }}
          className="toy-btn toy-btn-sun flex-1 text-lg sm:text-xl"
        >
          <Printer className="h-5 w-5" />
          <span>Lưu bằng khen</span>
        </button>
      </div>
    </div>
  );
}
