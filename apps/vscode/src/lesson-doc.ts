import * as vscode from "vscode";
import { findCachedLesson } from "./catalog.js";

export interface LessonDocInput {
  id: string;
  courseId: string;
  title: string;
  markdown?: string | null;
  pdfPath?: string | null;
}

export type LessonDocView =
  | { kind: "markdown"; title: string; bodyHtml: string }
  | { kind: "pdf-only"; title: string; courseId: string; lessonId: string }
  | { kind: "empty"; title: string };

const VIEW_TYPE = "falcon.lessonDoc";

let currentPanel: vscode.WebviewPanel | undefined;

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function safeHref(escapedHref: string): string | undefined {
  const raw = escapedHref
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
  if (/^https?:\/\//i.test(raw) || /^mailto:/i.test(raw)) {
    return escapeHtml(raw);
  }
  return undefined;
}

function renderInline(text: string): string {
  const token =
    /`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|(?<!\*)\*([^*]+)\*(?!\*)/g;
  const parts: string[] = [];
  let last = 0;
  for (const match of text.matchAll(token)) {
    const index = match.index ?? 0;
    if (index > last) {
      parts.push(text.slice(last, index));
    }
    if (match[1] !== undefined) {
      parts.push(`<code>${match[1]}</code>`);
    } else if (match[2] !== undefined && match[3] !== undefined) {
      const href = safeHref(match[3]);
      parts.push(href ? `<a href="${href}">${match[2]}</a>` : match[2]);
    } else if (match[4] !== undefined) {
      parts.push(`<strong>${match[4]}</strong>`);
    } else if (match[5] !== undefined) {
      parts.push(`<em>${match[5]}</em>`);
    }
    last = index + match[0].length;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts.join("");
}

/** Same authoring marker Web's MarkdownSlides strips before render. */
const CLASS_DIRECTIVE = /<!--\s*_class:\s*\w+\s*-->/g;

function isBlockquote(line: string): boolean {
  return /^&gt;( |$)/.test(line);
}

function splitTableRow(line: string): string[] {
  let cells = line.trim();
  if (cells.startsWith("|")) cells = cells.slice(1);
  if (cells.endsWith("|")) cells = cells.slice(0, -1);
  return cells.split("|").map((cell) => cell.trim());
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.includes("|") && splitTableRow(trimmed).length >= 2;
}

function isTableSeparator(line: string): boolean {
  if (!isTableRow(line)) return false;
  return splitTableRow(line).every((cell) => /^:?-+:?$/.test(cell));
}

function isBlockStart(line: string): boolean {
  return (
    /^#{1,6} /.test(line) ||
    /^```/.test(line) ||
    /^[-*+] /.test(line) ||
    /^\d+\. /.test(line) ||
    /^---$/.test(line.trim()) ||
    isBlockquote(line) ||
    isTableRow(line)
  );
}

function renderTable(header: string[], rows: string[][]): string {
  const th = header.map((cell) => `<th>${renderInline(cell)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`;
}

/** Escape raw HTML first, then emit GFM-equivalent tags. No HTML passthrough. */
export function markdownToHtml(markdown: string): string {
  const stripped = markdown.replaceAll("\r\n", "\n").replace(CLASS_DIRECTIVE, "");
  const escaped = escapeHtml(stripped);
  const lines = escaped.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (/^```([\w-]*)?$/.test(line)) {
      const lang = /^```([\w-]*)?$/.exec(line)?.[1] ?? "";
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !/^```$/.test(lines[i] ?? "")) {
        code.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) {
        i += 1;
      }
      const cls = lang ? ` class="language-${lang}"` : "";
      out.push(`<pre><code${cls}>${code.join("\n")}</code></pre>`);
      continue;
    }

    const heading = /^(#{1,6}) (.+)$/.exec(line);
    if (heading?.[1] && heading[2] !== undefined) {
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^---$/.test(line.trim())) {
      out.push("<hr />");
      i += 1;
      continue;
    }

    if (isBlockquote(line)) {
      const quoted: string[] = [];
      while (i < lines.length && isBlockquote(lines[i] ?? "")) {
        quoted.push((lines[i] ?? "").replace(/^&gt; ?/, ""));
        i += 1;
      }
      out.push(`<blockquote><p>${renderInline(quoted.join(" "))}</p></blockquote>`);
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1] ?? "")) {
      const header = splitTableRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i] ?? "") && !isTableSeparator(lines[i] ?? "")) {
        rows.push(splitTableRow(lines[i] ?? ""));
        i += 1;
      }
      out.push(renderTable(header, rows));
      continue;
    }

    if (/^[-*+] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+] /.test(lines[i] ?? "")) {
        items.push(`<li>${renderInline((lines[i] ?? "").slice(2))}</li>`);
        i += 1;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i] ?? "")) {
        items.push(`<li>${renderInline((lines[i] ?? "").replace(/^\d+\. /, ""))}</li>`);
        i += 1;
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && (lines[i] ?? "").trim() !== "" && !isBlockStart(lines[i] ?? "")) {
      para.push(lines[i] ?? "");
      i += 1;
    }
    out.push(`<p>${renderInline(para.join(" "))}</p>`);
  }

  return out.join("\n");
}

export function resolveLessonDoc(lesson: LessonDocInput): LessonDocView {
  const markdown = lesson.markdown?.trim();
  if (markdown) {
    return {
      kind: "markdown",
      title: lesson.title,
      bodyHtml: markdownToHtml(markdown),
    };
  }
  if (lesson.pdfPath?.trim()) {
    return {
      kind: "pdf-only",
      title: lesson.title,
      courseId: lesson.courseId,
      lessonId: lesson.id,
    };
  }
  return { kind: "empty", title: lesson.title };
}

function viewBody(view: LessonDocView): string {
  switch (view.kind) {
    case "markdown":
      return view.bodyHtml;
    case "pdf-only": {
      const args = encodeURIComponent(JSON.stringify([view.courseId, view.lessonId]));
      return [
        `<h1>${escapeHtml(view.title)}</h1>`,
        "<p>このレッスンは PDF スライドです。拡張内では表示できません。</p>",
        `<p><a href="command:falcon.openInWeb?${args}">Web で開く</a></p>`,
      ].join("\n");
    }
    case "empty":
      return [
        `<h1>${escapeHtml(view.title)}</h1>`,
        "<p>本文を準備中です</p>",
      ].join("\n");
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}

export function buildLessonDocHtml(view: LessonDocView): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:;" />
  <title>${escapeHtml(view.title)}</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      line-height: 1.6;
      padding: 1.25rem 1.5rem 2rem;
      max-width: 52rem;
    }
    h1, h2, h3, h4, h5, h6 { font-weight: 600; line-height: 1.3; }
    pre {
      overflow: auto;
      padding: 0.75rem 1rem;
      background: var(--vscode-textCodeBlock-background);
      border-radius: 4px;
    }
    code { font-family: var(--vscode-editor-font-family); font-size: 0.9em; }
    a { color: var(--vscode-textLink-foreground); }
    ul, ol { padding-left: 1.4rem; }
    blockquote {
      margin: 0.75rem 0;
      padding: 0.15rem 0 0.15rem 0.9rem;
      border-left: 3px solid var(--vscode-textBlockQuote-border);
    }
    table { border-collapse: collapse; margin: 0.75rem 0; }
    th, td {
      border: 1px solid var(--vscode-panel-border);
      padding: 0.35rem 0.6rem;
      text-align: left;
    }
  </style>
</head>
<body>
${viewBody(view)}
</body>
</html>`;
}

function mergeWithCatalog(lesson: LessonDocInput): LessonDocInput {
  const cached = findCachedLesson(lesson.courseId, lesson.id);
  return {
    ...lesson,
    markdown: lesson.markdown?.trim() ? lesson.markdown : cached?.markdown,
    pdfPath: lesson.pdfPath?.trim() ? lesson.pdfPath : cached?.pdfPath,
  };
}

/** Open (or reuse) one WebviewPanel for a text / slides lesson. */
export function openLessonDoc(lesson: LessonDocInput): void {
  const view = resolveLessonDoc(mergeWithCatalog(lesson));
  const html = buildLessonDocHtml(view);

  if (!currentPanel) {
    currentPanel = vscode.window.createWebviewPanel(
      VIEW_TYPE,
      lesson.title,
      vscode.ViewColumn.Active,
      {
        enableScripts: false,
        localResourceRoots: [],
        enableCommandUris: ["falcon.openInWeb"],
      },
    );
    currentPanel.onDidDispose(() => {
      currentPanel = undefined;
    });
  } else {
    currentPanel.title = lesson.title;
    currentPanel.reveal(vscode.ViewColumn.Active);
  }

  currentPanel.webview.html = html;
}
