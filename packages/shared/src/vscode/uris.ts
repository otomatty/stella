export const VSCODE_EXT_ID = "falcon.informal";

export function buildVscodeLinkUri(code: string): string {
  return `vscode://${VSCODE_EXT_ID}/link?code=${encodeURIComponent(code)}`;
}

/**
 * レッスンのディープリンク。 `code` を載せると拡張側が同じ URI で JWT 交換まで済ませるため、
 * Web に接続専用ページを置かなくても「VS Code で開く」1 クリックで接続 → レッスン表示まで通る。
 */
export function buildVscodeLessonUri(courseId: string, lessonId: string, code?: string): string {
  const q = new URLSearchParams({ courseId, lessonId });
  if (code) q.set("code", code);
  return `vscode://${VSCODE_EXT_ID}/lesson?${q.toString()}`;
}
