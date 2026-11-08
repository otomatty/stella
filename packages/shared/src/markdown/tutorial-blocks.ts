/** アプリの操作動画への1行の参照。コード例の中では解釈しない。 */
export type TutorialSegment =
  | { kind: "markdown"; markdown: string; line: number }
  | { kind: "tutorial"; id: string; line: number };

export function parseTutorialBlocks(source: string): {
  segments: TutorialSegment[];
  issues: { line: number; message: string }[];
} {
  const segments: TutorialSegment[] = [];
  const issues: { line: number; message: string }[] = [];
  let fence: { char: string; length: number } | null = null;
  let body: string[] = [];
  let start = 1;
  const flush = () => {
    if (body.length) segments.push({ kind: "markdown", markdown: body.join("\n"), line: start });
    body = [];
  };
  for (const [index, line] of source.replace(/\r\n/g, "\n").split("\n").entries()) {
    const marker = /^[ \t]*(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      if (marker?.[1]?.[0] === fence.char && marker[1].length >= fence.length && !marker[2]?.trim())
        fence = null;
    } else if (marker?.[1] && !(marker[1][0] === "`" && marker[2]?.includes("`"))) {
      fence = { char: marker[1][0] ?? "`", length: marker[1].length };
    } else if (/^:::tutorial(?:\s|$)/.test(line)) {
      const match = /^:::tutorial[ \t]+([a-z0-9]+(?:-[a-z0-9]+)*)[ \t]*$/.exec(line);
      if (match?.[1]) {
        flush();
        segments.push({ kind: "tutorial", id: match[1], line: index + 1 });
        start = index + 2;
        continue;
      }
      issues.push({
        line: index + 1,
        message: "`:::tutorial <id>` を1行で書きます (id は英小文字・数字・ハイフン)",
      });
    }
    if (!body.length) start = index + 1;
    body.push(line);
  }
  flush();
  return { segments, issues };
}

export function replaceTutorialBlocks(source: string, render: (id: string) => string): string {
  return parseTutorialBlocks(source)
    .segments.map((s) => (s.kind === "markdown" ? s.markdown : render(s.id)))
    .join("\n");
}
