/**
 * 面談対策 — 音声セッション (対話ログ UI) の純ロジック (Issue #234)。
 *
 * 1 問のやり取りは「面接官ターン (質問 → 深掘り①〜③)」の連なりで、 受講者は各ターンに
 * 録音で答える。 質問文は既定で非表示 (耳だけモード) なので、 テキストは振り返り用。
 */

import { type InterviewAudioPart, splitDeepDive } from "./audio.js";

export interface SessionTurn {
  part: InterviewAudioPart;
  /** 面接官が読み上げる一言。 */
  ask: string;
  /** 深掘りに付いている受講者向けの対策メモ (振り返りで出す)。 */
  hint: string | null;
}

/** 質問 → 深掘り①〜③ のターン列。 本文が空の深掘りは飛ばす。 */
export function buildSessionTurns(q: {
  question: string;
  deep1?: string | null;
  deep2?: string | null;
  deep3?: string | null;
}): SessionTurn[] {
  const turns: SessionTurn[] = [{ part: "question", ask: q.question, hint: null }];
  for (const part of ["deep1", "deep2", "deep3"] as const) {
    const raw = q[part];
    if (!raw) continue;
    const { ask, hint } = splitDeepDive(raw);
    if (ask === "") continue;
    turns.push({ part, ask, hint });
  }
  return turns;
}

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

/**
 * 次の面接官ターン。 最後まで答え終えたら null (= 振り返りへ)。
 * パス (スキップ) も「答えた」と同じ扱いで次の深掘りへ進む。
 */
export function nextTurnIndex(turns: readonly SessionTurn[], current: number): number | null {
  const next = current + 1;
  return next < turns.length ? next : null;
}
