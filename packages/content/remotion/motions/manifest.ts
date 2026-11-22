export const MOTIONS = {
  "vending-change": { title: "自動販売機のお釣り", beats: 5, seconds: [3.0, 3.0, 4.6, 2.3, 2.4] },
  "entry-form": { title: "申込用紙の記入欄", beats: 5, seconds: [2.5, 3.0, 4.0, 2.2, 1.8] },
  "call-staff": { title: "担当の人を名前で呼ぶ", beats: 5, seconds: [2.5, 3.0, 3.4, 3.4, 2.2] },
  "quote-marks": { title: "作文のかぎかっこ", beats: 4, seconds: [2.5, 1.8, 1.8, 3.2] },
  contacts: { title: "スマートフォンの連絡先", beats: 5, seconds: [2.5, 1.6, 2.2, 2.0, 1.8] },
  "test-total": { title: "テストの合計点", beats: 4, seconds: [2.5, 2.2, 4.0, 2.2] },
  "onigiri-times": { title: "おにぎり 3 個の値段", beats: 4, seconds: [2.5, 3.0, 3.0, 1.8] },
  "age-floor": { title: "年齢の数え方", beats: 4, seconds: [2.5, 3.0, 3.2, 2.4] },
  "pizza-share": { title: "ピザを 4 人で分ける", beats: 5, seconds: [2.5, 2.2, 3.5, 2.8, 1.8] },
  "bus-seats": { title: "遠足のバスの台数", beats: 5, seconds: [2.5, 1.8, 3.2, 2.4, 2.4] },
  "route-search": { title: "乗り換え案内の入力", beats: 5, seconds: [2.5, 2.6, 1.6, 2.2, 2.2] },
  "shopping-order": { title: "パンと牛乳の買い物", beats: 5, seconds: [2.5, 3.0, 2.0, 2.2, 1.8] },
  "candy-rest": { title: "あめを 3 人で分ける", beats: 4, seconds: [2.5, 2.2, 3.0, 2.2] },
  "platform-sign": { title: "駅ののりば案内", beats: 4, seconds: [2.5, 1.4, 3.6, 1.8] },
} as const;

export type MotionId = keyof typeof MOTIONS;
