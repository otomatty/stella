export interface WorkRecord {
  id: string;
  week: string;
  title: string;
  minutes: number | null;
  status: "draft" | "confirmed";
}
