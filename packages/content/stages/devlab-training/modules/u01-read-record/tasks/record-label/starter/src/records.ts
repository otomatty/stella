export interface WorkRecord {
  id: string;
  week: string;
  title: string;
  minutes: number | null;
  status: "draft" | "confirmed";
}

export const records: WorkRecord[] = [
  {
    id: "r1",
    week: "2026-W10",
    title: "設計レビュー",
    minutes: 30,
    status: "confirmed",
  },
  {
    id: "r2",
    week: "2026-W10",
    title: "動作確認",
    minutes: 20,
    status: "draft",
  },
  {
    id: "r3",
    week: "2026-W11",
    title: "動作確認",
    minutes: 60,
    status: "confirmed",
  },
  {
    id: "r4",
    week: "2026-W10",
    title: "準備",
    minutes: 0,
    status: "draft",
  },
  {
    id: "r5",
    week: "2026-W10",
    title: "画面調整",
    minutes: null,
    status: "draft",
  },
];
