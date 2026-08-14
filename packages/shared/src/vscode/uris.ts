export const VSCODE_EXT_ID = "falcon.informal";

export function buildVscodeLinkUri(code: string): string {
  return `vscode://${VSCODE_EXT_ID}/link?code=${encodeURIComponent(code)}`;
}

export function buildVscodeLessonUri(courseId: string, lessonId: string): string {
  const q = new URLSearchParams({ courseId, lessonId });
  return `vscode://${VSCODE_EXT_ID}/lesson?${q.toString()}`;
}
