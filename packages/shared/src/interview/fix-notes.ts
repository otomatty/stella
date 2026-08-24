/**
 * 面談対策 — 改善点メモ (Issue #234)。
 *
 * 1 問のやり取りを終えた振り返りで受講者が書き、 質問に紐付いて溜まる。 未解決の
 * メモは次回その質問に答える直前に再表示され (= 改善ループ)、 克服したらチェックで
 * 消し込む。 定型チップも自由入力も同じ 1 行として保存する。
 */

/** 振り返り画面に出す定型チップ (押すとそのままメモ 1 行になる)。 */
export const FIX_NOTE_CHIPS = [
  "結論から先に",
  "具体例を足す",
  "数字を即答できるように",
  "言い淀みを減らす",
  "専門用語をかみ砕く",
  "目安時間に収める",
] as const;

/** 1 メモの上限。 メモは一言で書くものなので短く抑える。 */
export const FIX_NOTE_MAX_LENGTH = 200;

/** 1 質問あたりに保持する未解決メモの上限 (練習直前の再表示が埋め尽くされないように)。 */
export const FIX_NOTE_MAX_UNRESOLVED_PER_QUESTION = 20;

export interface FixNote {
  id: string;
  question_no: number;
  text: string;
  /** ISO 8601。 */
  created_at: string;
  /** 克服して消し込んだ時刻。 未解決は null。 */
  resolved_at: string | null;
}

/** 前後の空白と連続改行を潰す。 空文字は「入力なし」として呼び出し側が弾く。 */
export function normalizeFixNoteText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, FIX_NOTE_MAX_LENGTH);
}

export function isResolved(note: Pick<FixNote, "resolved_at">): boolean {
  return note.resolved_at != null;
}

/** 未解決のメモを古い順に返す (書いた順に読み返せるようにする)。 */
export function unresolvedFixNotes<T extends Pick<FixNote, "created_at" | "resolved_at">>(
  notes: readonly T[],
): T[] {
  return notes
    .filter((n) => !isResolved(n))
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** 履歴表示用。 未解決を先に、 それぞれ新しい順。 */
export function sortFixNotesForHistory<T extends Pick<FixNote, "created_at" | "resolved_at">>(
  notes: readonly T[],
): T[] {
  return notes.slice().sort((a, b) => {
    const resolvedDiff = Number(isResolved(a)) - Number(isResolved(b));
    if (resolvedDiff !== 0) return resolvedDiff;
    return b.created_at.localeCompare(a.created_at);
  });
}

export function fixNotesByQuestion<T extends Pick<FixNote, "question_no">>(
  notes: readonly T[],
): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const note of notes) {
    const list = map.get(note.question_no);
    if (list) list.push(note);
    else map.set(note.question_no, [note]);
  }
  return map;
}

export function summarizeFixNotes(notes: readonly Pick<FixNote, "resolved_at">[]): {
  total: number;
  unresolved: number;
  resolved: number;
} {
  const resolved = notes.filter(isResolved).length;
  return { total: notes.length, unresolved: notes.length - resolved, resolved };
}
