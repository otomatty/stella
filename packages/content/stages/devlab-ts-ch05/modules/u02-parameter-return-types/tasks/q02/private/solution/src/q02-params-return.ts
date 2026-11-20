export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new Error("min は max 以下にしてください");
  }
  return Math.min(Math.max(value, min), max);
}

export function logLine(lines: string[], level: "info" | "warn" | "error", message: string): void {
  lines.push(`[${level.toUpperCase()}] ${message}`);
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  let text = "";
  if (h > 0) {
    text += `${h}時間`;
  }
  if (m > 0) {
    text += `${m}分`;
  }
  if (s > 0 || text === "") {
    text += `${s}秒`;
  }
  return text;
}
