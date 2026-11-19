const QUOTES = ['"', "'", "`"];
const QUALIFIED_METHOD =
  /^[\p{ID_Start}_][\p{ID_Continue}]*(?:\.[\p{ID_Start}_][\p{ID_Continue}]*)*$/u;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** テストの題が書かれた最初の行 (0 始まり)。 */
export function findTestLine(source: string, testName: string): number | undefined {
  const title = testName.split(" › ").at(-1);
  if (!title || !source) return undefined;

  const quotedTitle = new RegExp(
    QUOTES.map((quote) => {
      const body = Array.from(title, (character) => {
        if (character === quote || character === "\\") return `\\\\${escapeRegExp(character)}`;
        if (QUOTES.includes(character)) return `(?:\\\\)?${character}`;
        return escapeRegExp(character);
      }).join("");
      return `(?<!\\\\)${quote}${body}${quote}`;
    }).join("|"),
  );
  const lines = source.split(/\r\n?|\n/);
  const quotedLine = lines.findIndex((line) => quotedTitle.test(line));
  if (quotedLine !== -1) return quotedLine;

  if (!QUALIFIED_METHOD.test(title)) return undefined;
  const method = title.slice(title.lastIndexOf(".") + 1);
  const declaration = new RegExp(`(?<![\\p{ID_Continue}_.])${escapeRegExp(method)}\\s*\\(`, "u");
  const methodLine = lines.findIndex((line) => declaration.test(line));
  return methodLine === -1 ? undefined : methodLine;
}
