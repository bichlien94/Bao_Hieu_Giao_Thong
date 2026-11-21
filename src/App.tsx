// Điều phối toàn bộ luồng chơi "Bé Lái Xe Khám Phá"
import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CertificateScreen } from './components/CertificateScreen';
import { ConfettiOverlay } from './components/ConfettiOverlay';
import { DrivingFallback2D } from './components/DrivingFallback2D';
import { DrivingHUD } from './components/DrivingHUD';
import { JunctionScreen } from './components/JunctionScreen';
import { SelectDestinationScreen } from './components/SelectDestinationScreen';
import { SelectVehicleScreen } from './components/SelectVehicleScreen';
import { TitleScreen } from './components/TitleScreen';
import { soundEngine } from './game/audio';
import {
  generateJunctionRoutes,
  getShapeQuestionForSign,
  pickFourSigns,
  PRAISE_MESSAGES,
  SEGMENT_DISTANCE_KM,
  type DestinationId,
  type JunctionRoute,
  type TrafficSignQuestion,
  type VehicleId,
} from './game/data';
import { DrivingScene3D } from './game/scenes/DrivingScene3D';
import { detectWebGLCapabilities } from './game/scenes/webglDetect';

type FlowScreen =
  | 'title'
  | 'select-vehicle'
  | 'select-destination'
  | 'driving'
  | 'junction'
  | 'certificate';

export default function App() {
  const [screen, setScreen] = useState<FlowScreen>('title');
  const [childName, setChildName] = useState<string>('Bạn nhỏ');
  const [vehicleId, setVehicleId] = useState<VehicleId>('family');
  const [destinationId, setDestinationId] = useState<DestinationId>('park');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Dữ liệu chuyến đi
  const [signs, setSigns] = useState<TrafficSignQuestion[]>(() => pickFourSigns());
  const [junctionRoutes, setJunctionRoutes] = useState<JunctionRoute[]>(() =>
    generateJunctionRoutes('park')
  );
  const [currentSignIndex, setCurrentSignIndex] = useState<number>(0);
  const [passedCount, setPassedCount] = useState<number>(0);
  const [firstTryCorrectCount, setFirstTryCorrectCount] = useState<number>(0);
  const [wrongOnCurrent, setWrongOnCurrent] = useState<boolean>(false);
  const [drivingPhase, setDrivingPhase] = useState<'driving' | 'question' | 'celebrating'>(
    'driving'
  );
  const [questionStage, setQuestionStage] = useState<'shape' | 'meaning'>('shape');
  const [feedback, setFeedback] = useState<{
    type: 'wrong' | 'correct';
    message: string;
  } | null>(null);
  const [score, setScore] = useState<number>(0);
  const [totalDistanceKm, setTotalDistanceKm] = useState<number>(0);

  // Keys hiệu ứng
  const [confettiKey, setConfettiKey] = useState<number>(0);
  const [scorePopKey, setScorePopKey] = useState<number>(0);
  const [shakeKey, setShakeKey] = useState<number>(0);

  // Container cô lập cho DrivingScene3D (tránh React re-render hủy WebGL)
  const drivingMountRef = useRef<HTMLDivElement | null>(null);
  const drivingSceneRef = useRef<DrivingScene3D | null>(null);
  const reachSignCallbackRef = useRef<() => void>(() => {});
  const advanceTimerRef = useRef<number>(0);

  const webglSupported = detectWebGLCapabilities().supported;
  const isDrivingBackdropActive = screen === 'title' || screen === 'driving';

  reachSignCallbackRef.current = () => {
    setDrivingPhase('question');
    setQuestionStage('shape');
    setFeedback(null);
    setWrongOnCurrent(false);
  };

  // Khởi tạo / dọn dẹp DrivingScene3D khi vào hoặc rời nhóm màn hình lái xe
  useEffect(() => {
    if (!webglSupported || !isDrivingBackdropActive || !drivingMountRef.current) {
      return;
    }

    const scene = new DrivingScene3D(drivingMountRef.current, vehicleId, {
      onReachSign: () => reachSignCallbackRef.current(),
    });
    drivingSceneRef.current = scene;

    if (screen === 'title') {
      scene.setCruiseMode(true);
    } else if (screen === 'driving') {
      scene.spawnNextSign(signs[0]);
    }

    return () => {
      scene.dispose();
      drivingSceneRef.current = null;
    };
    // Chỉ tạo lại khi bật/tắt nhóm màn hình lái xe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webglSupported, isDrivingBackdropActive]);

  // Đồng bộ chế độ & mẫu xe khi chuyển từ Title sang Driving hoặc đổi xe
  useEffect(() => {
    const scene = drivingSceneRef.current;
    if (!scene) return;
    scene.setVehicle(vehicleId);
    if (screen === 'title') {
      scene.setCruiseMode(true);
    }
  }, [screen, vehicleId]);

  useEffect(() => {
    return () => {
      clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const handleToggleMute = () => {
    const nextMuted = soundEngine.toggleMute();
    setIsMuted(nextMuted);
  };

  const handleStartFromTitle = (name: string) => {
    setChildName(name);
    setScreen('select-vehicle');
  };

  const handleStartTrip = () => {
    clearTimeout(advanceTimerRef.current);
    const freshSigns = pickFourSigns();
    const freshRoutes = generateJunctionRoutes(destinationId);
    setSigns(freshSigns);
    setJunctionRoutes(freshRoutes);
    setCurrentSignIndex(0);
    setPassedCount(0);
    setFirstTryCorrectCount(0);
    setWrongOnCurrent(false);
    setScore(0);
    setTotalDistanceKm(0);
    setFeedback(null);
    setDrivingPhase('driving');
    setQuestionStage('shape');
    setScreen('driving');

    // Nếu DrivingScene3D đang sẵn (nếu có), phát biển đầu tiên
    if (drivingSceneRef.current) {
      drivingSceneRef.current.setVehicle(vehicleId);
      drivingSceneRef.current.spawnNextSign(freshSigns[0]);
    }
  };

  const handleSelectAnswer = (optionIdx: number) => {
    if (drivingPhase !== 'question' || feedback?.type === 'correct') return;
    soundEngine.unlock();

    const currentSign = signs[currentSignIndex];
    if (!currentSign) return;

    // Bước 1: Hỏi biển báo hình gì
    if (questionStage === 'shape') {
      const shapePrompt = getShapeQuestionForSign(currentSign);
      if (optionIdx === shapePrompt.correctIndex) {
        setScore((s) => s + 5);
        setScorePopKey((k) => k + 1);
        soundEngine.playCorrect();
        setFeedback({
          type: 'correct',
          message: shapePrompt.correctFeedback,
        });

        clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = window.setTimeout(() => {
          setQuestionStage('meaning');
          setFeedback(null);
        }, 950);
      } else {
        setWrongOnCurrent(true);
        setShakeKey((k) => k + 1);
        soundEngine.playWrongGentle();
        drivingSceneRef.current?.triggerWrongWobble();
        setFeedback({
          type: 'wrong',
          message: `Chưa đúng rồi, ${childName} nhìn lại nhé! ${shapePrompt.hint}`,
        });
      }
      return;
    }

    // Bước 2: Hỏi công dụng / ý nghĩa của biển báo
    if (optionIdx === currentSign.correctIndex) {
      const gained = wrongOnCurrent ? 10 : 15;
      const praise =
        PRAISE_MESSAGES[Math.floor(Math.random() * PRAISE_MESSAGES.length)];

      if (!wrongOnCurrent) {
        setFirstTryCorrectCount((c) => c + 1);
      }

      setScore((s) => s + gained);
      setScorePopKey((k) => k + 1);
      setConfettiKey((k) => k + 1);
      setPassedCount((p) => p + 1);
      setTotalDistanceKm((d) => d + SEGMENT_DISTANCE_KM);
      setDrivingPhase('celebrating');
      setFeedback({
        type: 'correct',
        message: `${praise} +${gained} ⭐ — ${currentSign.explanation}`,
      });

      soundEngine.playCorrect();
      soundEngine.playBoost();
      drivingSceneRef.current?.triggerCorrectBoost();

      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = window.setTimeout(() => {
        const nextIdx = currentSignIndex + 1;
        if (nextIdx >= signs.length) {
          setScreen('junction');
        } else {
          setCurrentSignIndex(nextIdx);
          setDrivingPhase('driving');
          setQuestionStage('shape');
          setFeedback(null);
          setWrongOnCurrent(false);
          drivingSceneRef.current?.spawnNextSign(signs[nextIdx]);
        }
      }, 2100);
    } else {
      setWrongOnCurrent(true);
      setShakeKey((k) => k + 1);
      soundEngine.playWrongGentle();
      drivingSceneRef.current?.triggerWrongWobble();
      setFeedback({
        type: 'wrong',
        message: `Chưa đúng rồi, ${childName} thử lại nhé! ${currentSign.hint}`,
      });
    }
  };

  const handleJunctionComplete = (chosenKm: number, bonusPoints: number) => {
    setScore((s) => s + bonusPoints);
    setTotalDistanceKm((d) => d + chosenKm);
    setConfettiKey((k) => k + 1);
    setScreen('certificate');
  };

  const handlePlayAgain = () => {
    clearTimeout(advanceTimerRef.current);
    setScreen('select-vehicle');
  };

  const activeSign = signs[currentSignIndex] || signs[0];
  const fallbackState =
    screen === 'title'
      ? 'cruise'
      : drivingPhase === 'question'
        ? 'stopped'
        : drivingPhase === 'celebrating'
          ? 'boosting'
          : 'approaching';

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Nền lái xe 3D (hoặc 2D dự phòng nếu thiết bị không có WebGL) */}
      {isDrivingBackdropActive &&
        (webglSupported ? (
          <div ref={drivingMountRef} className="fixed inset-0 z-0 h-full w-full" />
        ) : (
          <DrivingFallback2D
            vehicleId={vehicleId}
            activeSign={screen === 'driving' ? activeSign : null}
            signState={fallbackState}
            onReachSign={() => reachSignCallbackRef.current()}
          />
        ))}

      {/* Nút âm thanh ở màn đầu & màn chọn */}
      {(screen === 'title' ||
        screen === 'select-vehicle' ||
        screen === 'select-destination') && (
        <button
          type="button"
          onClick={handleToggleMute}
          aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          className="toy-btn toy-btn-white no-print fixed top-3 right-3 z-40 min-h-[48px] rounded-full px-3 py-1.5 sm:top-4 sm:right-5"
        >
          {isMuted ? (
            <VolumeX className="h-5 w-5 text-slate-500" />
          ) : (
            <Volume2 className="h-5 w-5 text-sky-600" />
          )}
        </button>
      )}

      {/* Các màn hình theo luồng chơi */}
      {screen === 'title' && (
        <TitleScreen initialName={childName} onStart={handleStartFromTitle} />
      )}

      {screen === 'select-vehicle' && (
        <SelectVehicleScreen
          childName={childName}
          selectedVehicle={vehicleId}
          onSelectVehicle={setVehicleId}
          onNext={() => setScreen('select-destination')}
        />
      )}

      {screen === 'select-destination' && (
        <SelectDestinationScreen
          selectedDestination={destinationId}
          onSelectDestination={setDestinationId}
          onBack={() => setScreen('select-vehicle')}
          onStartDrive={handleStartTrip}
        />
      )}

      {screen === 'driving' && (
        <DrivingHUD
          childName={childName}
          vehicleId={vehicleId}
          destinationId={destinationId}
          score={score}
          scorePopKey={scorePopKey}
          currentSignIndex={currentSignIndex}
          passedCount={passedCount}
          phase={drivingPhase}
          questionStage={questionStage}
          currentSign={activeSign}
          feedback={feedback}
          shakeKey={shakeKey}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onSelectAnswer={handleSelectAnswer}
        />
      )}

      {screen === 'junction' && (
        <JunctionScreen
          childName={childName}
          vehicleId={vehicleId}
          destinationId={destinationId}
          routes={junctionRoutes}
          score={score}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onBurstConfetti={() => setConfettiKey((k) => k + 1)}
          onComplete={handleJunctionComplete}
        />
      )}

      {screen === 'certificate' && (
        <CertificateScreen
          childName={childName}
          vehicleId={vehicleId}
          destinationId={destinationId}
          score={score}
          firstTryCorrectCount={firstTryCorrectCount}
          totalDistanceKm={totalDistanceKm}
          onPlayAgain={handlePlayAgain}
        />
      )}

      {/* Hiệu ứng Confetti & Sao bay */}
      <ConfettiOverlay
        burstKey={confettiKey}
        continuous={screen === 'certificate'}
      />
    </div>
  );
}
