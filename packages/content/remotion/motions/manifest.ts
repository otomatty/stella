export const MOTIONS = {
  "vending-change": { title: "自動販売機のお釣り", beats: 5, seconds: [3.0, 3.0, 4.6, 2.3, 2.4] },
} as const;

export type MotionId = keyof typeof MOTIONS;
