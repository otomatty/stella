export const VSCODE_EXT_ID = "falcon.informal";

export function buildVscodeLinkUri(code: string): string {
  return `vscode://${VSCODE_EXT_ID}/link?code=${encodeURIComponent(code)}`;
}

/**
 * レッスンのディープリンク。 `code` を載せると拡張側が同じ URI で JWT 交換まで済ませるため、
 * Web に接続専用ページを置かなくても「VS Code で開く」1 クリックで接続 → レッスン表示まで通る。
 */
export function buildVscodeLessonUri(stageId: string, lessonId: string, code?: string): string {
  // TODO(stage-rename-compat): 旧拡張(<=0.1.0)互換。 拡張更新の浸透後に削除
  // 旧拡張は `courseId` しか読まない。 拡張は手動配布で Web と同時更新できないので、
  // 両方のキーに同じ値を載せる (新拡張は `stageId` を優先して読む)。
  const q = new URLSearchParams({ stageId, courseId: stageId, lessonId });
  if (code) q.set("code", code);
  return `vscode://${VSCODE_EXT_ID}/lesson?${q.toString()}`;
}
