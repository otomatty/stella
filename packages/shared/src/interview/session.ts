/**
 * 面談対策 — 音声セッション (対話ログ UI) の純ロジック (Issue #234)。
 *
 * 1 問は「面接官が質問を読み上げる → 受講者が録音で答える」の一往復。 質問文は既定で
 * 非表示 (耳だけモード) なので、 テキストは振り返り用。
 */

/**
 * 目安時間 (`time`) を秒に直す。 "30秒" / "30〜45秒" / "1分30秒" などを受け、
 * 幅がある場合は上限を採る (超過の判定は甘めにする)。 逆質問の "（逆質問）" は null。
 */
export function parseTimeLimitSec(time: string | null | undefined): number | null {
  if (!time) return null;
  const normalized = time.replace(/[〜~ー–—]/g, "~");
  const last = normalized.split("~").pop() ?? "";
  const minutes = /(\d+)\s*分/.exec(last);
  const seconds = /(\d+)\s*秒/.exec(last);
  if (!minutes && !seconds) return null;
  const total =
    (minutes ? Number.parseInt(minutes[1] as string, 10) * 60 : 0) +
    (seconds ? Number.parseInt(seconds[1] as string, 10) : 0);
  return total > 0 ? total : null;
}

export type TimerTone = "normal" | "warn" | "over";

/** 経過時間の色。 目安の 80% で警告、 超過で over。 目安が無い質問は常に normal。 */
export function timerTone(elapsedSec: number, limitSec: number | null): TimerTone {
  if (limitSec == null || limitSec <= 0) return "normal";
  if (elapsedSec >= limitSec) return "over";
  if (elapsedSec >= limitSec * 0.8) return "warn";
  return "normal";
}

export function formatElapsed(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}
