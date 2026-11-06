import type { StaffTaskDetail } from "@stella/shared/tasks/staff-stage";

export type StaffTaskTab = "overview" | "statement" | "submissions" | "variants" | "revisions";
export function parseStaffTaskTab(value: unknown): StaffTaskTab {
  return value === "statement" ||
    value === "submissions" ||
    value === "variants" ||
    value === "revisions"
    ? value
    : "overview";
}

/** 見出しやコードブロックを飛ばし、最初の本文の段落を平文にする。 */
export function firstReadmeParagraph(readme: string | null): string | null {
  if (!readme) return null;
  const lines: string[] = [];
  let fence: string | null = null;
  for (const line of readme.replace(/\r\n/g, "\n").split("\n")) {
    const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      continue;
    }
    if (marker) {
      if (lines.length) break;
      fence = marker;
      continue;
    }
    if (!line.trim() || /^\s{0,3}#{1,6}(\s|$)/.test(line) || /^( {4}|\t)/.test(line)) {
      if (lines.length) break;
      continue;
    }
    if (/^\s*(=+|-+)\s*$/.test(line)) {
      lines.length = 0;
      continue;
    }
    lines.push(line.trim());
  }
  const text = lines
    .join(" ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/\\([\\`*_[\]{}()#+.!>-])/g, "$1")
    .trim();
  return text || null;
}

export function staffTaskCounts(counts: StaffTaskDetail["counts"]) {
  return [
    { label: "着手", count: counts.started },
    { label: "手元で合格", count: counts.localPassed },
    { label: "提出", count: counts.submitted },
    { label: "AI が確認中", count: counts.reviewing },
    { label: "講師の確認待ち", count: counts.waiting },
    { label: "再提出", count: counts.resubmit },
    { label: "合格", count: counts.passed },
  ];
}

export function taskGithubUrl(
  sourcePath: string,
  target: "source" | "variants" | "history" = "source",
): string {
  // GitHub のリンク先は各セグメントを符号化する。教材ファイルは取り込まない。
  const segments = [
    ...sourcePath.split("/"),
    ...(target === "variants" ? ["private", "variants"] : []),
  ];
  const path = segments.map(encodeURIComponent).join("/");
  return `https://github.com/otomatty/stella/${target === "history" ? "commits" : "tree"}/main/${path}`;
}
