/**
 * 面談対策 — 読み上げ音声 (TTS) のセグメント定義。
 *
 * 音声は admin が事前生成して R2 (`interview-tts/`) に登録し、 受講者への配信は
 * R2 読み出しのみ (AI を呼ばない)。 Issue #234 で対話ログ UI が深掘り①〜③も
 * 音声で流すようになったため、 1 質問あたり最大 4 セグメント (質問 + 深掘り 3) を持つ。
 *
 * オブジェクト名は質問だけ従来どおり `<no>.mp3` (既存の登録済み音声を活かす)、
 * 深掘りは `<no>-deep1.mp3` のように接尾辞を付ける。
 */

export const INTERVIEW_AUDIO_PARTS = ["question", "deep1", "deep2", "deep3"] as const;

export type InterviewAudioPart = (typeof INTERVIEW_AUDIO_PARTS)[number];

export function isInterviewAudioPart(value: unknown): value is InterviewAudioPart {
  return typeof value === "string" && (INTERVIEW_AUDIO_PARTS as readonly string[]).includes(value);
}

/** R2 オブジェクト名 (プレフィックスは含まない)。 */
export function interviewAudioObjectName(no: number, part: InterviewAudioPart): string {
  return part === "question" ? `${no}.mp3` : `${no}-${part}.mp3`;
}

/** R2 オブジェクト名 → 質問番号 + パート。 想定外の名前は null (一覧から無視する)。 */
export function parseInterviewAudioObjectName(
  name: string,
): { no: number; part: InterviewAudioPart } | null {
  const m = /^(\d+)(?:-(deep[123]))?\.mp3$/.exec(name);
  if (!m) return null;
  const no = Number.parseInt(m[1] as string, 10);
  if (!Number.isInteger(no) || no <= 0) return null;
  const part = (m[2] ?? "question") as InterviewAudioPart;
  return { no, part };
}

/** API / UI がやり取りするセグメント識別子 (`12:question` / `12:deep1`)。 */
export function interviewAudioSegmentId(no: number, part: InterviewAudioPart): string {
  return `${no}:${part}`;
}

export function parseInterviewAudioSegmentId(
  id: string,
): { no: number; part: InterviewAudioPart } | null {
  const [left, right] = id.split(":");
  const no = Number.parseInt(left ?? "", 10);
  if (!Number.isInteger(no) || no <= 0) return null;
  if (!isInterviewAudioPart(right)) return null;
  return { no, part: right };
}

/**
 * 深掘りの本文は「面接官が聞く一文→受講者向けの対策メモ」という形で入っている。
 * 音声で流すのも対話ログのバブルに出すのも前半だけで、 後半は振り返り用のヒント。
 */
export function splitDeepDive(text: string): { ask: string; hint: string | null } {
  const idx = text.indexOf("→");
  if (idx < 0) return { ask: text.trim(), hint: null };
  const ask = text.slice(0, idx).trim();
  const hint = text.slice(idx + 1).trim();
  return { ask, hint: hint === "" ? null : hint };
}

export interface InterviewAudioSegment {
  no: number;
  part: InterviewAudioPart;
  /** 読み上げるテキスト (深掘りは「→」の前だけ)。 */
  text: string;
}

/**
 * 1 質問の生成対象セグメント。 本文が空の深掘りは対象外 (登録すべき音声が無い)。
 * 逆質問 (受講者から聞く質問) は音声セッションで出題しないので呼び出し側で除く。
 */
export function interviewAudioSegments(q: {
  no: number;
  question: string;
  deep1?: string | null;
  deep2?: string | null;
  deep3?: string | null;
}): InterviewAudioSegment[] {
  const segments: InterviewAudioSegment[] = [{ no: q.no, part: "question", text: q.question }];
  for (const part of ["deep1", "deep2", "deep3"] as const) {
    const raw = q[part];
    if (!raw) continue;
    const { ask } = splitDeepDive(raw);
    if (ask === "") continue;
    segments.push({ no: q.no, part, text: ask });
  }
  return segments;
}

/**
 * 読み上げテキストの指紋。 生成した音声の R2 customMetadata に載せておき、
 * 質問文が変わったかどうか (= 音声が古いか) を本文の保持なしで判定する。
 *
 * FNV-1a の 32bit。 暗号用途ではなく「変わったか」を見るだけなので衝突耐性より
 * 依存なしで Workers / ブラウザ / Node のどこでも同じ値になることを優先する。
 */
export function interviewAudioTextHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    // 32bit の FNV prime 乗算 (オーバーフローを避けてシフトで組む)。
    hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** 生成済み音声の R2 customMetadata に載せるキー。 */
export const INTERVIEW_AUDIO_TEXT_HASH_KEY = "textHash";

/**
 * 登録済み音声が現在の本文より古いか。
 *
 * 指紋を持たない音声 (この仕組みより前に生成されたもの) は **古いと見なさない**。
 * 実際に古いかは分からないので、 全件を「要更新」で塗って再生成を促すより、
 * 変わったと分かっているものだけを挙げるほうが運用の判断を誤らせない。
 */
export function isInterviewAudioStale(
  storedHash: string | null | undefined,
  currentText: string,
): boolean {
  if (!storedHash) return false;
  return storedHash !== interviewAudioTextHash(currentText);
}
