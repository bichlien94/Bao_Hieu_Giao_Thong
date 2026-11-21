// Dữ liệu và logic cốt lõi của game "Bé Lái Xe Khám Phá"

export type VehicleId = 'family' | 'taxi' | 'police' | 'bus';
export type DestinationId = 'library' | 'hospital' | 'school' | 'park';
export type GameScreen = 'title' | 'prepare' | 'driving' | 'junction' | 'certificate';

export interface VehicleOption {
  id: VehicleId;
  name: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  emoji: string;
  hornFreqs: [number, number];
}

export interface DestinationOption {
  id: DestinationId;
  name: string;
  shortName: string;
  description: string;
  color: string;
  emoji: string;
  arrivalMsg: string;
}

export type SignShape =
  | 'rectangle-signal'
  | 'circle-prohibit'
  | 'triangle-warn'
  | 'circle-mandate'
  | 'square-info';

export type SignArtId =
  | 'traffic-signal-rect'
  | 'no-entry'
  | 'no-left-turn'
  | 'no-horn'
  | 'pedestrian'
  | 'children'
  | 'traffic-light'
  | 'railway'
  | 'go-straight'
  | 'parking';

export interface TrafficSignQuestion {
  id: string;
  name: string;
  shape: SignShape;
  art: SignArtId;
  question: string;
  options: string[];
  correctIndex: number;
  hint: string;
  explanation: string;
}

export type JunctionRouteId = 'road1' | 'road2' | 'road3';
export type JunctionLandmarkType = 'traffic-light' | 'shop' | 'bridge-roadwork';

export interface JunctionRoute {
  id: JunctionRouteId;
  label: string;
  colorName: string;
  hex: string;
  shadowHex: string;
  segments: [number, number];
  distanceKm: number;
  hasRoadwork: boolean;
  isCorrect: boolean;
  landmarkType: JunctionLandmarkType;
  landmarkLabel: string;
  wrongHint: string;
  correctExplanation: string;
}

export const VEHICLES: VehicleOption[] = [
  {
    id: 'family',
    name: 'Xe Gia Đình',
    tagline: 'Đỏ rực rỡ, êm ái dạo phố',
    primaryColor: '#FF5A5F',
    accentColor: '#FFD93D',
    emoji: '🚗',
    hornFreqs: [440, 554],
  },
  {
    id: 'taxi',
    name: 'Xe Taxi',
    tagline: 'Vàng tươi năng động',
    primaryColor: '#FFD93D',
    accentColor: '#1E293B',
    emoji: '🚕',
    hornFreqs: [493, 622],
  },
  {
    id: 'police',
    name: 'Xe Cảnh Sát',
    tagline: 'Giữ trật tự an toàn',
    primaryColor: '#2563EB',
    accentColor: '#FFFFFF',
    emoji: '🚓',
    hornFreqs: [587, 784],
  },
  {
    id: 'bus',
    name: 'Xe Buýt Nhí',
    tagline: 'Chở đầy niềm vui tới lớp',
    primaryColor: '#FF8A3D',
    accentColor: '#FEF08A',
    emoji: '🚌',
    hornFreqs: [261, 329],
  },
];

export const DESTINATIONS: DestinationOption[] = [
  {
    id: 'library',
    name: 'Thư Viện Thành Phố',
    shortName: 'Thư Viện',
    description: 'Kho tàng sách hay chờ bé khám phá',
    color: '#A78BFA',
    emoji: '📚',
    arrivalMsg: 'Chào mừng bác tài nhí đã tới Thư Viện ngập tràn sách hay!',
  },
  {
    id: 'hospital',
    name: 'Bệnh Viện Nhi Đồng',
    shortName: 'Bệnh Viện',
    description: 'Nơi các bác sĩ chăm sóc sức khỏe',
    color: '#FF5A5F',
    emoji: '🏥',
    arrivalMsg: 'Bác tài nhí lái xe thật an toàn và đến Bệnh Viện đúng giờ!',
  },
  {
    id: 'school',
    name: 'Trường Tiểu Học',
    shortName: 'Trường Học',
    description: 'Ngôi trường thân yêu cùng bạn bè',
    color: '#FF8A3D',
    emoji: '🏫',
    arrivalMsg: 'Reng reng! Xe đã đưa bé tới cổng Trường Tiểu Học an toàn rồi!',
  },
  {
    id: 'park',
    name: 'Công Viên Thiếu Nhi',
    shortName: 'Công Viên Thiếu Nhi',
    description: 'Vòng đu quay, cầu trượt & cây xanh mát',
    color: '#6BCB77',
    emoji: '🎡',
    arrivalMsg: 'Tuyệt vời! Cả nhà đã tới Công Viên Thiếu Nhi an toàn và vui chơi thật thích!',
  },
];

export const TRAFFIC_SIGNS: TrafficSignQuestion[] = [
  {
    id: 'traffic-signal-rect',
    name: 'Trụ đèn giao thông',
    shape: 'rectangle-signal',
    art: 'traffic-signal-rect',
    question: 'Khi trụ đèn giao thông bật đèn ĐỎ sáng lên, bác tài nhí phải làm gì?',
    options: [
      'Dừng xe lại hoàn toàn trước vạch dừng',
      'Tăng ga chạy thật nhanh qua ngã tư',
      'Bấm còi thật to rồi đi tiếp',
      'Quay đầu xe đi hướng khác',
    ],
    correctIndex: 0,
    hint: 'Gợi ý: Màu ĐỎ trên trụ đèn giao thông là tín hiệu báo DỪNG LẠI đấy bé ơi!',
    explanation: 'Đúng rồi! Gặp đèn đỏ trên trụ đèn giao thông, mọi xe phải dừng lại trước vạch dừng.',
  },
  {
    id: 'no-entry',
    name: 'Biển báo Cấm đi ngược chiều',
    shape: 'circle-prohibit',
    art: 'no-entry',
    question: 'Biển tròn màu đỏ có gạch ngang trắng ở giữa báo hiệu điều gì?',
    options: [
      'Đường ưu tiên cho xe đạp',
      'Cấm đi ngược chiều (không được đi vào)',
      'Phía trước có trạm xăng',
      'Được phép đỗ xe ở lề đường',
    ],
    correctIndex: 1,
    hint: 'Gợi ý: Biển tròn đỏ gạch ngang giống như thanh chắn không cho xe đi vào đó!',
    explanation: 'Chính xác! Đây là biển Cấm đi ngược chiều, các xe không được phép đi theo hướng này.',
  },
  {
    id: 'pedestrian',
    name: 'Biển báo Đường người đi bộ cắt ngang',
    shape: 'triangle-warn',
    art: 'pedestrian',
    question: 'Biển tam giác vàng viền đỏ có hình người bước trên vạch kẻ nhắc nhở điều gì?',
    options: [
      'Cấm người đi bộ qua đường',
      'Chú ý giảm tốc độ, sắp tới lối sang đường cho người đi bộ',
      'Đường dành riêng cho xe đua',
      'Khu vực có công trường sửa chữa',
    ],
    correctIndex: 1,
    hint: 'Gợi ý: Tam giác vàng viền đỏ là biển cảnh báo nguy hiểm, cần đi chậm lại nhường đường!',
    explanation: 'Giỏi lắm! Bác tài cần giảm tốc độ và nhường đường cho người đi bộ sang đường nhé.',
  },
  {
    id: 'children',
    name: 'Biển báo Trẻ em qua đường',
    shape: 'triangle-warn',
    art: 'children',
    question: 'Biển tam giác vàng có hình hai bạn nhỏ nắm tay nhau báo hiệu điều gì?',
    options: [
      'Phía trước có khu vực trường học hoặc trẻ em thường qua đường',
      'Công viên giải trí mở cửa miễn phí',
      'Cấm học sinh đi bộ trên vỉa hè',
      'Đường một chiều chỉ cho xe buýt',
    ],
    correctIndex: 0,
    hint: 'Gợi ý: Hình hai bạn nhỏ đeo cặp sách gợi nhớ đến nơi nào nhỉ?',
    explanation: 'Chuẩn xác! Khi thấy biển này gần trường học, xe phải đi thật chậm và chú ý các bạn nhỏ.',
  },
  {
    id: 'no-left-turn',
    name: 'Biển báo Cấm rẽ trái',
    shape: 'circle-prohibit',
    art: 'no-left-turn',
    question: 'Biển tròn viền đỏ có mũi tên rẽ trái bị gạch chéo màu đỏ có ý nghĩa gì?',
    options: [
      'Bắt buộc phải rẽ sang trái',
      'Cấm các loại xe rẽ trái',
      'Phía trước có đường vòng xuyến',
      'Được phép quay đầu xe tự do',
    ],
    correctIndex: 1,
    hint: 'Gợi ý: Vòng tròn đỏ có dấu gạch chéo nghĩa là "Cấm" làm theo hình mũi tên đó bé!',
    explanation: 'Tuyệt vời! Mũi tên rẽ trái bị gạch chéo tức là Cấm rẽ trái tại ngã rẽ này.',
  },
  {
    id: 'traffic-light',
    name: 'Biển báo Giao nhau có tín hiệu đèn',
    shape: 'triangle-warn',
    art: 'traffic-light',
    question: 'Thấy biển tam giác vàng có hình cột đèn đỏ - vàng - xanh nghĩa là gì?',
    options: [
      'Phía trước có đèn tín hiệu giao thông',
      'Cửa hàng bán đèn trang trí',
      'Đường tắt vào đường hầm tối',
      'Khu vực cấm bật đèn xe',
    ],
    correctIndex: 0,
    hint: 'Gợi ý: Nhìn 3 chấm tròn đỏ, vàng, xanh giống hệt cột đèn giao thông ở ngã tư!',
    explanation: 'Đúng rồi! Phía trước sắp tới ngã tư có đèn tín hiệu, bé nhớ chuẩn bị quan sát màu đèn nhé.',
  },
  {
    id: 'go-straight',
    name: 'Biển báo Hướng đi thẳng phải theo',
    shape: 'circle-mandate',
    art: 'go-straight',
    question: 'Biển hình tròn màu xanh dương có mũi tên trắng chỉ thẳng lên trên là biển gì?',
    options: [
      'Cấm đi thẳng về phía trước',
      'Hiệu lệnh bắt buộc các xe chỉ được đi thẳng',
      'Đường sắp có dốc cao nguy hiểm',
      'Nơi dành cho xe quay đầu',
    ],
    correctIndex: 1,
    hint: 'Gợi ý: Biển tròn nền xanh dương là biển hiệu lệnh, bảo xe phải đi theo hướng mũi tên!',
    explanation: 'Xuất sắc! Biển tròn xanh mũi tên trắng chỉ thẳng yêu cầu xe chỉ được phép đi thẳng.',
  },
  {
    id: 'parking',
    name: 'Biển báo Nơi đỗ xe',
    shape: 'square-info',
    art: 'parking',
    question: 'Biển hình vuông màu xanh dương có chữ P lớn màu trắng chỉ dẫn điều gì?',
    options: [
      'Khu vực đường đang thi công',
      'Cấm dừng xe và đỗ xe',
      'Nơi được phép đỗ xe an toàn',
      'Trạm cảnh sát giao thông',
    ],
    correctIndex: 2,
    hint: 'Gợi ý: Chữ P viết tắt của "Parking", nền xanh dương là biển chỉ dẫn nơi thuận tiện!',
    explanation: 'Hoan hô! Chữ P nền xanh dương chỉ dẫn đây là bãi đỗ xe được phép đậu xe.',
  },
  {
    id: 'railway',
    name: 'Biển báo Đường sắt có rào chắn',
    shape: 'triangle-warn',
    art: 'railway',
    question: 'Biển tam giác vàng có hình hàng rào chấn song báo hiệu sắp tới nơi nào?',
    options: [
      'Lối vào sở thú có chuồng gỗ',
      'Nơi đường bộ giao nhau với đường sắt có rào chắn',
      'Cầu vượt bằng gỗ qua sông',
      'Công viên có hàng rào hoa',
    ],
    correctIndex: 1,
    hint: 'Gợi ý: Hàng rào chắn dùng để chặn xe khi có tàu hỏa chạy ngang qua đó bé!',
    explanation: 'Chính xác! Phía trước giao cắt với đường tàu hỏa có rào chắn, bé hãy đi chậm và quan sát nhé.',
  },
  {
    id: 'no-horn',
    name: 'Biển báo Cấm bóp còi',
    shape: 'circle-prohibit',
    art: 'no-horn',
    question: 'Biển tròn viền đỏ có hình chiếc kèn bị gạch chéo nhắc bác tài điều gì?',
    options: [
      'Được phép bấm còi chào nhau',
      'Cấm sử dụng còi xe (giữ yên tĩnh)',
      'Sắp tới buổi hòa nhạc đường phố',
      'Kiểm tra còi xe trước khi đi',
    ],
    correctIndex: 1,
    hint: 'Gợi ý: Hình chiếc kèn tượng trưng cho tiếng còi xe, bị gạch chéo nghĩa là không được bấm!',
    explanation: 'Giỏi quá! Biển Cấm bóp còi thường đặt gần bệnh viện, trường học để giữ yên tĩnh.',
  },
];

export const PRAISE_MESSAGES = [
  'Tuyệt vời quá!',
  'Bác tài nhí siêu đỉnh!',
  'Chính xác rồi bé ơi!',
  'Quá xuất sắc luôn!',
  'Bé nhớ luật giỏi lắm!',
];

export const SEGMENT_DISTANCE_KM = 5; // Quãng đường mỗi chặng giữa các biển báo (km)

export const SHAPE_OPTIONS = [
  'Hình tròn',
  'Hình tam giác',
  'Hình vuông',
  'Hình chữ nhật',
] as const;

export interface ShapeQuestionPrompt {
  question: string;
  options: readonly string[];
  correctIndex: number;
  hint: string;
  correctFeedback: string;
}

export function getShapeQuestionForSign(sign: TrafficSignQuestion): ShapeQuestionPrompt {
  let correctIndex = 0;
  let shapeLabel = 'Hình tròn';
  let hint = 'Gợi ý: Bé nhìn đường viền ngoài của biển báo nhé — tròn xoe không có góc nhọn!';

  if (sign.shape === 'triangle-warn') {
    correctIndex = 1;
    shapeLabel = 'Hình tam giác';
    hint = 'Gợi ý: Bé thử đếm xem biển báo có mấy góc nhọn nhé (1, 2, 3 góc)!';
  } else if (sign.shape === 'square-info') {
    correctIndex = 2;
    shapeLabel = 'Hình vuông';
    hint = 'Gợi ý: Biển báo có 4 cạnh bằng nhau và 4 góc vuông vắn đó bé!';
  } else if (sign.shape === 'rectangle-signal') {
    correctIndex = 3;
    shapeLabel = 'Hình chữ nhật';
    hint = 'Gợi ý: Bé nhìn trụ đèn giao thông đứng thẳng có 2 cạnh dài và 2 cạnh ngắn tạo thành hình gì nhé!';
  }

  return {
    question: 'Trước tiên, bé nhìn biển báo bên đường và cho biết có hình gì?',
    options: SHAPE_OPTIONS,
    correctIndex,
    hint,
    correctFeedback: `Đúng rồi! Đây là ${shapeLabel.toLowerCase()}. +5 ⭐`,
  };
}

export function pickFourSigns(): TrafficSignQuestion[] {
  const pool = [...TRAFFIC_SIGNS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 4);
}

export function generateJunctionRoutes(destinationId: DestinationId = 'park'): JunctionRoute[] {
  // Công viên Thiếu nhi dùng đúng 3 con đường và số km theo bài toán của bạn An
  if (destinationId === 'park') {
    return [
      {
        id: 'road1',
        label: 'Đường thứ nhất',
        colorName: 'Xanh dương',
        hex: '#2563EB',
        shadowHex: '#1D4ED8',
        segments: [10, 15],
        distanceKm: 25,
        hasRoadwork: false,
        isCorrect: true,
        landmarkType: 'traffic-light',
        landmarkLabel: 'Ngã tư có đèn giao thông',
        wrongHint: '',
        correctExplanation:
          'Đường thứ nhất dài 10 + 15 = 25 km, vừa ngắn nhất vừa an toàn! Khi đi qua ngã tư, bé nhớ chú ý đèn tín hiệu giao thông và các biển báo nhé!',
      },
      {
        id: 'road2',
        label: 'Đường thứ hai',
        colorName: 'Hồng san hô',
        hex: '#EC4899',
        shadowHex: '#BE185D',
        segments: [15, 15],
        distanceKm: 30,
        hasRoadwork: false,
        isCorrect: false,
        landmarkType: 'shop',
        landmarkLabel: 'Cửa hàng',
        wrongHint:
          'Đường thứ hai qua Cửa hàng dài 15 + 15 = 30 km, dài hơn đường 25 km rồi! Bé thử kiểm tra đường khác nhé.',
        correctExplanation: '',
      },
      {
        id: 'road3',
        label: 'Đường thứ ba',
        colorName: 'Xanh lá',
        hex: '#16A34A',
        shadowHex: '#15803D',
        segments: [10, 15],
        distanceKm: 25,
        hasRoadwork: true,
        isCorrect: false,
        landmarkType: 'bridge-roadwork',
        landmarkLabel: 'Cây cầu & Đường sửa chữa',
        wrongHint:
          'Tuy Đường thứ ba dài 10 + 15 = 25 km nhưng có biển báo ĐƯỜNG ĐANG SỬA CHỮA và rào chắn phía sau cây cầu nên không an toàn!',
        correctExplanation: '',
      },
    ];
  }

  // Các điểm đến khác cũng có 2 chặng km cộng lại và kiểm tra an toàn biển báo sửa chữa
  const presets: Array<{ short: [number, number]; long: [number, number] }> = [
    { short: [8, 12], long: [14, 12] },
    { short: [10, 10], long: [15, 10] },
    { short: [9, 11], long: [12, 13] },
  ];
  const preset = presets[Math.floor(Math.random() * presets.length)];
  const shortTotal = preset.short[0] + preset.short[1];
  const longTotal = preset.long[0] + preset.long[1];

  return [
    {
      id: 'road1',
      label: 'Đường thứ nhất',
      colorName: 'Xanh dương',
      hex: '#2563EB',
      shadowHex: '#1D4ED8',
      segments: preset.short,
      distanceKm: shortTotal,
      hasRoadwork: false,
      isCorrect: true,
      landmarkType: 'traffic-light',
      landmarkLabel: 'Ngã tư có đèn giao thông',
      wrongHint: '',
      correctExplanation: `Đường thứ nhất dài ${preset.short[0]} + ${preset.short[1]} = ${shortTotal} km, vừa ngắn nhất vừa an toàn! Nhớ quan sát đèn giao thông và biển báo trên đường nhé!`,
    },
    {
      id: 'road2',
      label: 'Đường thứ hai',
      colorName: 'Hồng san hô',
      hex: '#EC4899',
      shadowHex: '#BE185D',
      segments: preset.long,
      distanceKm: longTotal,
      hasRoadwork: false,
      isCorrect: false,
      landmarkType: 'shop',
      landmarkLabel: 'Cửa hàng',
      wrongHint: `Đường thứ hai qua Cửa hàng dài ${preset.long[0]} + ${preset.long[1]} = ${longTotal} km, dài hơn ${shortTotal} km rồi! Bé chọn lại nhé.`,
      correctExplanation: '',
    },
    {
      id: 'road3',
      label: 'Đường thứ ba',
      colorName: 'Xanh lá',
      hex: '#16A34A',
      shadowHex: '#15803D',
      segments: preset.short,
      distanceKm: shortTotal,
      hasRoadwork: true,
      isCorrect: false,
      landmarkType: 'bridge-roadwork',
      landmarkLabel: 'Cây cầu & Đường sửa chữa',
      wrongHint: `Đường thứ ba tuy dài ${preset.short[0]} + ${preset.short[1]} = ${shortTotal} km nhưng đang có rào chắn và biển báo ĐƯỜNG ĐANG SỬA CHỮA, không an toàn!`,
      correctExplanation: '',
    },
  ];
}

export function calculateStars(firstTryCorrectCount: number): 1 | 2 | 3 {
  if (firstTryCorrectCount >= 4) return 3;
  if (firstTryCorrectCount >= 2) return 2;
  return 1;
}

export function formatVietnameseDate(date = new Date()): string {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `Ngày ${day} tháng ${month} năm ${year}`;
}
