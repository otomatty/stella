/**
 * 面談対策 — 読み上げ音声 (TTS) のオブジェクト名と鮮度判定。
 *
 * 音声は admin が事前生成して R2 (`interview-tts/`) に登録し、 受講者への配信は
 * R2 読み出しのみ (AI を呼ばない)。 1 質問 = 1 音声で、 オブジェクト名は `<no>.mp3`。
 *
 * かつては深掘り①〜③も読み上げていたため 1 質問が最大 4 セグメントに割れていたが、
 * 深掘りは受講者の回答に応答できず面談の再現になっていなかったため廃止した。
 * 既存の `<no>-deep1.mp3` は参照されない (パースが弾く) —— 消さずに放置しても
 * 配信・一覧に出てこないだけなので、 掃除は R2 側の運用で行う。
 */

/** 質問音声タブから選べる読み上げモデル (生成 API の許可リストと共有)。 */
export const INTERVIEW_TTS_MODEL_IDS = ["grok-tts", "openai/tts-1", "openai/tts-1-hd"] as const;

export type InterviewTtsModelId = (typeof INTERVIEW_TTS_MODEL_IDS)[number];

export const DEFAULT_INTERVIEW_TTS_MODEL_ID: InterviewTtsModelId = "grok-tts";

export const INTERVIEW_TTS_MODEL_OPTIONS: ReadonlyArray<{
  id: InterviewTtsModelId;
  label: string;
}> = [
  { id: "grok-tts", label: "Grok TTS" },
  { id: "openai/tts-1", label: "OpenAI tts-1" },
  { id: "openai/tts-1-hd", label: "OpenAI tts-1-hd" },
];

export function isInterviewTtsModelId(value: unknown): value is InterviewTtsModelId {
  return (
    typeof value === "string" && (INTERVIEW_TTS_MODEL_IDS as readonly string[]).includes(value)
  );
}

/** R2 オブジェクト名 (プレフィックスは含まない)。 */
export function interviewAudioObjectName(no: number): string {
  return `${no}.mp3`;
}

/**
 * R2 オブジェクト名 → 質問番号。 想定外の名前は null (一覧から無視する)。
 * 深掘り時代の `<no>-deep1.mp3` もここで落ちる。
 */
export function parseInterviewAudioObjectName(name: string): number | null {
  const m = /^(\d+)\.mp3$/.exec(name);
  if (!m) return null;
  const no = Number.parseInt(m[1] as string, 10);
  return Number.isInteger(no) && no > 0 ? no : null;
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
 * 指紋を持たない音声 (この仕組みより前に生成されたもの) も **古いとみなす**。
 *
 * かつては逆だった —— 実際に古いかは分からないので、 全件を「要更新」で塗るより
 * 変わったと分かっているものだけを挙げるほうが運用の判断を誤らせない、 という
 * 判断だった。 その前提は「指紋の無い音声は questions.json の文面そのままで
 * 作られており、 正本が動いていないなら今も合っている」に乗っていたが、
 * 想定質問を実面談どおりの短い口語へ書き換えた時点で 197 問すべての正本が動いた。
 * 指紋が無い = この書き換えより前の生成 = 旧い文面の読み上げ、 と言い切れる。
 *
 * 検証できないものを「現行」に倒すと、 画面の質問文と食い違う読み上げが警告も
 * 再生成の導線もないまま受講者に流れる (この仕組みが防ごうとしているもの)。
 * 検証できないなら古い側へ倒し、 staff の試聴 → 再生成の導線に載せる。
 */
export function isInterviewAudioStale(
  storedHash: string | null | undefined,
  currentText: string,
): boolean {
  if (!storedHash) return true;
  return storedHash !== interviewAudioTextHash(currentText);
}
