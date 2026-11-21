// Màn bản đồ chọn đường (km): Hiển thị 2 chặng đường cộng lại, công trình mốc 3D & chọn đường ngắn - an toàn nhất
import { BookOpen, Navigation, Star, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { soundEngine } from '../game/audio';
import {
  DESTINATIONS,
  type DestinationId,
  type JunctionRoute,
  type VehicleId,
} from '../game/data';
import {
  JunctionScene3D,
  type ProjectedMapAnchors,
} from '../game/scenes/JunctionScene3D';
import { detectWebGLCapabilities } from '../game/scenes/webglDetect';

interface JunctionScreenProps {
  childName: string;
  vehicleId: VehicleId;
  destinationId: DestinationId;
  routes: JunctionRoute[];
  score: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onBurstConfetti: () => void;
  onComplete: (distanceKm: number, bonusPoints: number) => void;
}

export function JunctionScreen({
  childName,
  vehicleId,
  destinationId,
  routes,
  score,
  isMuted,
  onToggleMute,
  onBurstConfetti,
  onComplete,
}: JunctionScreenProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<JunctionScene3D | null>(null);
  const [anchors, setAnchors] = useState<ProjectedMapAnchors | null>(null);
  const [hintMsg, setHintMsg] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [isDrivingToGoal, setIsDrivingToGoal] = useState(false);
  const [firstTryJunction, setFirstTryJunction] = useState(true);
  const [showStory, setShowStory] = useState(false);

  const webglSupported = detectWebGLCapabilities().supported;
  const destination =
    DESTINATIONS.find((d) => d.id === destinationId) || DESTINATIONS[0];
  const displayName = childName === 'Bạn nhỏ' ? 'An' : childName;

  const handleRoutePickRef = useRef<(route: JunctionRoute) => void>(() => {});

  handleRoutePickRef.current = (route: JunctionRoute) => {
    if (isDrivingToGoal) return;
    soundEngine.unlock();

    if (route.isCorrect) {
      const bonus = firstTryJunction ? 20 : 10;
      setIsDrivingToGoal(true);
      setHintMsg(`Chính xác! ${route.correctExplanation} +${bonus} ⭐`);
      soundEngine.playCorrect();
      onBurstConfetti();

      if (webglSupported && sceneRef.current) {
        sceneRef.current.highlightAndDriveRoute(route.id, () => {
          window.setTimeout(() => {
            onComplete(route.distanceKm, bonus);
          }, 900);
        });
      } else {
        window.setTimeout(() => {
          onComplete(route.distanceKm, bonus);
        }, 1800);
      }
    } else {
      setFirstTryJunction(false);
      setShakeKey((k) => k + 1);
      soundEngine.playWrongGentle();
      sceneRef.current?.flashBranch(route.id);
      setHintMsg(route.wrongHint);
    }
  };

  useEffect(() => {
    if (!webglSupported || !containerRef.current) return;

    const junctionScene = new JunctionScene3D(
      containerRef.current,
      vehicleId,
      destinationId,
      routes,
      (route) => handleRoutePickRef.current(route),
      (projected) => setAnchors(projected)
    );
    sceneRef.current = junctionScene;

    return () => {
      junctionScene.dispose();
      sceneRef.current = null;
    };
  }, [webglSupported, vehicleId, destinationId, routes]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-[#7DD3FC] via-[#BAE6FD] to-[#86EFAC]">
      {/* Vùng 3D bản đồ ngã rẽ */}
      {webglSupported ? (
        <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      ) : (
        <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-4 px-4">
          <div className="flex items-center gap-4 text-4xl font-extrabold text-slate-800">
            <span>🏠 Nhà {displayName}</span>
            <span>➡️</span>
            <span>
              {destination.emoji} {destination.shortName}
            </span>
          </div>
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            {routes.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRoutePickRef.current(r)}
                style={{ backgroundColor: r.hex }}
                className="toy-btn flex-col py-4 text-white"
              >
                <span className="text-base font-extrabold">{r.label}</span>
                <span className="text-xl font-extrabold tabular-nums">
                  {r.segments[0]} km + {r.segments[1]} km
                </span>
                <span className="text-xs font-bold opacity-95">
                  {r.landmarkLabel}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Nhãn địa điểm & 2 chặng km bám theo tọa độ 3D */}
      {webglSupported && anchors && (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          {/* Biển tên Nhà An */}
          {anchors.start.visible && (
            <div
              style={{
                left: `${anchors.start.x}px`,
                top: `${anchors.start.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute rounded-xl border-2 border-amber-300 bg-[#B45309] px-2.5 py-0.5 text-xs font-extrabold whitespace-nowrap text-amber-50 shadow-md sm:text-sm"
            >
              🏠 Nhà {displayName}
            </div>
          )}

          {/* Biển tên Cửa hàng */}
          {anchors.shop.visible && (
            <div
              style={{
                left: `${anchors.shop.x}px`,
                top: `${anchors.shop.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute rounded-full border-2 border-white bg-[#EF4444] px-2.5 py-0.5 text-xs font-extrabold whitespace-nowrap text-white shadow-md sm:text-sm"
            >
              🏪 Cửa hàng
            </div>
          )}

          {/* Biển tên Điểm đến */}
          {anchors.destination.visible && (
            <div
              style={{
                left: `${anchors.destination.x}px`,
                top: `${anchors.destination.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute rounded-2xl border-2 border-amber-500 bg-[#FEF08A] px-3 py-0.5 text-xs font-extrabold whitespace-nowrap text-amber-950 shadow-md sm:text-sm"
            >
              {destination.emoji} {destination.shortName}
            </div>
          )}

          {/* 2 chặng km + tên đường trên mỗi con đường */}
          {!isDrivingToGoal &&
            anchors.routes.map((rAnchor) => {
              const route = routes.find((r) => r.id === rAnchor.id);
              if (!route) return null;

              return (
                <div key={route.id}>
                  {/* Chặng 1 + Nhãn tên đường */}
                  {rAnchor.seg1.visible && (
                    <button
                      type="button"
                      onClick={() => handleRoutePickRef.current(route)}
                      style={{
                        left: `${rAnchor.seg1.x}px`,
                        top: `${rAnchor.seg1.y}px`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className="pointer-events-auto absolute flex flex-col items-center gap-0.5 transition-transform hover:scale-105 active:scale-95"
                    >
                      <span
                        style={{ backgroundColor: route.hex }}
                        className="rounded-full border-2 border-white px-2.5 py-0.5 text-[11px] font-extrabold whitespace-nowrap text-white shadow sm:text-xs"
                      >
                        {route.label}
                      </span>
                      <span
                        style={{
                          borderColor: route.shadowHex,
                          boxShadow: `0 3px 0 ${route.shadowHex}`,
                        }}
                        className="rounded-full border-2 bg-white px-3 py-0.5 text-sm font-extrabold whitespace-nowrap text-slate-800 tabular-nums sm:text-base"
                      >
                        {route.segments[0]} km
                      </span>
                    </button>
                  )}

                  {/* Chặng 2 */}
                  {rAnchor.seg2.visible && (
                    <button
                      type="button"
                      onClick={() => handleRoutePickRef.current(route)}
                      style={{
                        left: `${rAnchor.seg2.x}px`,
                        top: `${rAnchor.seg2.y}px`,
                        transform: 'translate(-50%, -50%)',
                        borderColor: route.shadowHex,
                        boxShadow: `0 3px 0 ${route.shadowHex}`,
                      }}
                      className="pointer-events-auto absolute rounded-full border-2 bg-white px-3 py-0.5 text-sm font-extrabold whitespace-nowrap text-slate-800 tabular-nums transition-transform hover:scale-105 active:scale-95 sm:text-base"
                    >
                      {route.segments[1]} km
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* HUD phía trên gọn gàng, không che bản đồ */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col items-center gap-1.5 px-2.5 pt-2 sm:px-5 sm:pt-2.5">
        <div className="flex w-full max-w-6xl items-center justify-between gap-2">
          {/* Điểm sao */}
          <div className="pointer-events-auto flex shrink-0 items-center gap-1.5 rounded-full border-[3px] border-amber-500 bg-[#FFD93D] px-3 py-1 text-amber-950 shadow-[0_4px_0_#D97706]">
            <Star className="h-4 w-4 fill-amber-600 text-amber-700 sm:h-5 sm:w-5" />
            <span className="text-base font-extrabold tabular-nums sm:text-lg">{score}</span>
          </div>

          {/* Câu hỏi ngắn gọn nằm giữa hàng trên trên màn hình rộng */}
          <div
            key={shakeKey}
            className={`toy-card pointer-events-auto hidden max-w-2xl flex-1 bg-white/95 px-4 py-1.5 text-center md:block ${
              shakeKey > 0 && !isDrivingToGoal ? 'animate-gentle-shake' : ''
            }`}
          >
            <h2 className="flex items-center justify-center gap-1.5 text-base font-extrabold text-slate-800 lg:text-lg">
              <Navigation className="h-5 w-5 shrink-0 text-[#0284C7]" />
              <span>
                {displayName} ơi, hãy cộng 2 chặng km và chọn con đường{' '}
                <span className="text-[#FF5A5F]">NGẮN, AN TOÀN NHẤT</span> tới{' '}
                {destination.shortName} nhé!
              </span>
            </h2>
          </div>

          {/* Nút Đọc đề bài & Âm thanh */}
          <div className="pointer-events-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playSelect();
                setShowStory((v) => !v);
              }}
              className="toy-btn toy-btn-sun min-h-[42px] rounded-full px-3 py-1 text-xs sm:px-3.5 sm:text-sm"
            >
              <BookOpen className="h-4 w-4 shrink-0" />
              <span>Đọc đề bài</span>
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              className="toy-btn toy-btn-white min-h-[42px] rounded-full px-2.5 py-1 sm:px-3"
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5 text-slate-500" />
              ) : (
                <Volume2 className="h-5 w-5 text-sky-600" />
              )}
            </button>
          </div>
        </div>

        {/* Thẻ câu hỏi cho màn hình nhỏ (< md) */}
        <div
          key={`mobile-${shakeKey}`}
          className={`toy-card pointer-events-auto w-full max-w-xl bg-white/95 px-3 py-1.5 text-center md:hidden ${
            shakeKey > 0 && !isDrivingToGoal ? 'animate-gentle-shake' : ''
          }`}
        >
          <h2 className="flex items-center justify-center gap-1.5 text-sm font-extrabold text-slate-800 sm:text-base">
            <Navigation className="h-4 w-4 shrink-0 text-[#0284C7]" />
            <span>
              {displayName} ơi, cộng 2 chặng km & chọn đường{' '}
              <span className="text-[#FF5A5F]">NGẮN, AN TOÀN NHẤT</span> nhé!
            </span>
          </h2>
        </div>

        {/* Thông báo phản hồi khi bé chọn đường */}
        {hintMsg && (
          <div
            className={`pointer-events-auto max-w-2xl rounded-2xl border-[3px] px-4 py-1.5 text-center text-sm font-extrabold shadow-md sm:text-base ${
              isDrivingToGoal
                ? 'border-emerald-500 bg-emerald-50 text-emerald-950'
                : 'border-amber-500 bg-amber-50 text-amber-950'
            }`}
          >
            {hintMsg}
          </div>
        )}
      </div>

      {/* Thanh chọn nhanh 3 con đường ở cạnh dưới để dễ bấm trên mọi màn hình */}
      {!isDrivingToGoal && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-center px-2 sm:bottom-3 sm:px-6">
          <div className="pointer-events-auto grid w-full max-w-3xl grid-cols-3 gap-2 sm:gap-3">
            {routes.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRoutePickRef.current(r)}
                style={{
                  backgroundColor: r.hex,
                  boxShadow: `0 5px 0 ${r.shadowHex}`,
                }}
                className="flex min-h-[58px] flex-col items-center justify-center rounded-2xl border-[3px] border-white px-2 py-1.5 text-white transition-transform hover:scale-[1.02] active:translate-y-1 sm:px-3"
              >
                <span className="text-xs font-extrabold sm:text-sm">{r.label}</span>
                <span className="text-sm font-extrabold tabular-nums sm:text-lg">
                  {r.segments[0]} + {r.segments[1]} km
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hộp thoại câu chuyện đầy đủ của mẹ & An khi bé bấm "Đọc đề bài" */}
      {showStory && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="toy-card relative w-full max-w-xl bg-white p-5 text-slate-800 sm:p-6">
            <button
              type="button"
              onClick={() => setShowStory(false)}
              aria-label="Đóng đề bài"
              className="absolute top-3 right-3 rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="mb-2 pr-8 text-xl font-extrabold text-[#0284C7]">
              📖 Tình huống của bạn {displayName}
            </h3>
            <p className="text-base leading-relaxed font-semibold text-slate-700">
              Một buổi sáng chủ nhật, bạn {displayName} được mẹ đưa đến{' '}
              <strong>{destination.shortName}</strong>. Mẹ nói với {displayName}:
            </p>
            <p className="my-2 rounded-2xl bg-sky-50 p-3 text-base font-bold text-sky-950 italic">
              “Con hãy quan sát bản đồ, tính xem mỗi con đường dài bao nhiêu ki-lô-mét
              và chọn con đường ngắn, an toàn nhất nhé!”
            </p>
            <ul className="space-y-1.5 text-sm font-bold text-slate-700 sm:text-base">
              {routes.map((r) => (
                <li key={r.id} className="flex items-start gap-2">
                  <span
                    className="mt-1.5 inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: r.hex }}
                  />
                  <span>
                    <strong>{r.label}:</strong> Chặng 1 dài {r.segments[0]} km, chặng 2
                    dài {r.segments[1]} km ({r.landmarkLabel}
                    {r.hasRoadwork ? ' — có biển báo đường đang sửa chữa' : ''}).
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm font-bold text-amber-800 sm:text-base">
              💡 Mẹ hỏi thêm: Khi đi trên đường, chúng ta cần chú ý những báo hiệu giao
              thông nào để đảm bảo an toàn?
            </p>

            <button
              type="button"
              onClick={() => setShowStory(false)}
              className="toy-btn toy-btn-green mt-4 w-full text-lg"
            >
              Bé hiểu rồi, chọn đường thôi!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
