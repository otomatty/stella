import { createHash } from "node:crypto";

/** 名前空間キーから安定した UUID 文字列を作る（再 seed で ID がずれないようにする）。 */
export function stableUuid(key: string): string {
  const h = createHash("sha1").update(key).digest();
  const bytes = Uint8Array.from(h.subarray(0, 16));
  const ver = bytes[6];
  const variant = bytes[8];
  if (ver === undefined || variant === undefined) {
    throw new Error("sha1 digest too short");
  }
  bytes[6] = (ver & 0x0f) | 0x50; // version 5-ish
  bytes[8] = (variant & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// 3 ステージへの分割で模試へ移ったレッスン。配布済みのリンク、解答、資料の版を
// 引き継ぐため、これらの UUID には引き続き元のステージの名前を使う。
const transferredExamLessons = new Set([
  "9-1-1",
  "doc-9-1",
  "quiz-9-1",
  "10-3-1",
  "doc-10-3",
  "quiz-10-3",
  "10-4-1",
  "doc-10-4",
  "quiz-10-4",
]);

export function lessonNamespace(stageId: string, lessonId: string): string {
  return stageId === "claude-developer-mock-exam" && transferredExamLessons.has(lessonId)
    ? "claude-developer-foundations"
    : stageId;
}

/** レッスン ID はステージ内で一意。セクションをキーに含めると移動時に履歴が切れる。 */
export function lessonUuid(
  tenantId: string,
  stageId: string,
  lessonId: string,
  revision?: number,
): string {
  const key = revision === undefined ? lessonId : `${lessonId}@r${revision}`;
  return stableUuid(`lesson:${tenantId}:${lessonNamespace(stageId, lessonId)}:${key}`);
}
