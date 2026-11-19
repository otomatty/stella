const ANSI_SGR = new RegExp(`${String.fromCharCode(27)}\\[[0-9:;]*m`, "g");
const VALUE_LIMIT = 200;

function preview(value: string): string {
  const characters = Array.from(value);
  return characters.length > VALUE_LIMIT ? `${characters.slice(0, VALUE_LIMIT).join("")}…` : value;
}

/** 比較の向きと値が分かる失敗メッセージだけを要約する。 */
export function expectedActual(message: string): { expected: string; actual: string } | undefined {
  const lines = message.replace(ANSI_SGR, "").split(/\r\n?|\n/);
  const firstLine = /^(?:AssertionError: )?expected (.*)$/.exec(lines[0])?.[1];
  let expected: string | undefined;
  let actual: string | undefined;

  if (firstLine !== undefined) {
    const separators = [
      ...firstLine.matchAll(/(?=( to (?:deeply equal|strictly equal|equal|be) ))/g),
    ];
    if (separators.length > 1) return undefined;
    const separator = separators[0];
    if (separator) {
      actual = firstLine.slice(0, separator.index).trim();
      expected = firstLine.slice(separator.index + separator[1].length).trim();
      if (separator[1] === " to be ") {
        expected = expected.replace(/ \/\/ Object\.is equality$/, "").trim();
        // 複数語の述語は、引用された文字列や配列・オブジェクトの値と区別する。
        if (
          /\s/.test(expected) &&
          !/^(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\[.*\]|\{.*\})$/.test(expected)
        )
          return undefined;
      }
    }
  }

  if (expected === undefined) {
    for (const line of lines) {
      const match = /^\s*(Expected|Received|Actual):(.*)$/.exec(line);
      if (!match) continue;
      const value = match[2].trim();
      if (match[1] === "Expected") {
        if (expected !== undefined) return undefined;
        expected = value;
      } else {
        if (actual !== undefined) return undefined;
        actual = value;
      }
    }
  }

  return expected && actual ? { expected: preview(expected), actual: preview(actual) } : undefined;
}
