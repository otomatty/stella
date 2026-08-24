/**
 * 擬似言語 (基本情報技術者試験 科目B) の字句解析 (#133)。
 *
 * 設計上の要点:
 *
 * - **行指向**。 擬似言語の文は改行で区切られ、 ブロックは `endif` / `endwhile` /
 *   `endfor` で閉じる。 よって `newline` を有意トークンとして落とさずに返す。
 * - **インデントを記録する**。 ブロックの大半はキーワードで閉じるが、
 *   (1) 関数本体の終端 (`○` の行より深いインデントが本体) と
 *   (2) `do 〜 while` の終端 `while` (ネストした while ループとの区別) だけは
 *   インデントでしか決められない。 行頭トークンに `indent` を持たせて parser に渡す。
 * - **識別子は「ASCII の連なり」か「日本語の連なり」のどちらか**で、 混在させない。
 *   こうしないと `iを1から` が 1 個の識別子に潰れて for 文の見出しが読めない。
 * - **助詞キーワードで日本語の連なりを分割する**。 `から要素数まで` のように
 *   助詞と識別子が地続きになるため、 `を` `から` `まで` `ずつ増やす` `ずつ減らす`
 *   `の要素数` は日本語の連なりの途中でも切り出す。 裏返して、 これらを含む識別子は
 *   使えない (`ADDING_LANGUAGE.md` に明記)。
 */

import { feError } from "./errors.js";

export type TokenKind =
  | "ident"
  | "number"
  | "string"
  | "particle"
  | "keyword"
  | "op"
  | "punct"
  | "newline"
  | "eof";

export interface Token {
  kind: TokenKind;
  value: string;
  line: number;
  column: number;
  /** 行頭トークンならその行のインデント幅 (スペース換算)。 それ以外は undefined。 */
  indent?: number;
}

/**
 * 日本語の連なりの途中でも切り出す助詞キーワード。
 * 長いものから順に試す (最長一致)。
 */
const PARTICLES = ["ずつ増やす", "ずつ減らす", "の要素数", "から", "まで", "を"] as const;

const KEYWORDS = new Set([
  "if",
  "elseif",
  "else",
  "endif",
  "while",
  "endwhile",
  "do",
  "for",
  "endfor",
  "return",
  "and",
  "or",
  "not",
  "true",
  "false",
  "mod",
]);

/** 単独記号の演算子。 複数文字の別記法は `readOperator` で吸収する。 */
const SINGLE_OPS = new Set(["←", "=", "≠", ">", "<", "≧", "≦", "+", "-", "×", "÷", "%"]);

const PUNCTS = new Set(["(", ")", "[", "]", "{", "}", ",", ":", "○"]);

/**
 * 全角 ASCII (U+FF01–U+FF5E) と全角スペースを半角へ落とす。
 *
 * 1 文字 → 1 文字の写像なので行・桁の位置がずれない。 `←` `≦` などの
 * 擬似言語固有の記号はここでは触らず、 ASCII 代替記法として字句解析側で受理する。
 */
export function normalizeSource(source: string): string {
  return source
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ")
    .replace(/[〇●]/g, "○")
    .replace(/\r\n?/g, "\n");
}

function isAsciiIdentStart(ch: string): boolean {
  return /[A-Za-z_]/.test(ch);
}

function isAsciiIdentPart(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch);
}

/** ひらがな・カタカナ・漢字。 識別子にも型名にも助詞にも使う。 */
function isJapanese(ch: string): boolean {
  return /[ぁ-ゟ゠-ヿ々㐀-䶿一-鿿]/.test(ch);
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

/** 文字列リテラルのエスケープを 1 文字ぶん解決する。 */
function unescapeChar(ch: string): string {
  switch (ch) {
    case "n":
      return "\n";
    case "t":
      return "\t";
    case "r":
      return "\r";
    default:
      return ch;
  }
}

export function tokenize(rawSource: string): Token[] {
  const src = normalizeSource(rawSource);
  const tokens: Token[] = [];

  let pos = 0;
  let line = 1;
  let lineStart = 0;
  /** 行頭トークンにだけ indent を付けるためのフラグ。 */
  let atLineStart = true;
  let indent = 0;

  const column = (): number => pos - lineStart + 1;

  const push = (kind: TokenKind, value: string, startPos: number): void => {
    const token: Token = { kind, value, line, column: startPos - lineStart + 1 };
    if (atLineStart) {
      token.indent = indent;
      atLineStart = false;
    }
    tokens.push(token);
  };

  while (pos < src.length) {
    const ch = src[pos];

    // 改行: 有意トークン。 次の行の行頭状態へ遷移する。
    if (ch === "\n") {
      tokens.push({ kind: "newline", value: "\n", line, column: column() });
      pos += 1;
      line += 1;
      lineStart = pos;
      atLineStart = true;
      indent = 0;
      // 行頭の空白を数えてインデント幅にする (タブは 4 幅として数える)。
      while (pos < src.length && (src[pos] === " " || src[pos] === "\t")) {
        indent += src[pos] === "\t" ? 4 : 1;
        pos += 1;
      }
      continue;
    }

    if (ch === " " || ch === "\t") {
      pos += 1;
      continue;
    }

    // コメント: `//` は行末まで、 `/* */` は対応する `*/` まで。
    if (ch === "/" && src[pos + 1] === "/") {
      while (pos < src.length && src[pos] !== "\n") {
        pos += 1;
      }
      continue;
    }
    if (ch === "/" && src[pos + 1] === "*") {
      const startLine = line;
      const startColumn = column();
      pos += 2;
      let closed = false;
      while (pos < src.length) {
        if (src[pos] === "*" && src[pos + 1] === "/") {
          pos += 2;
          closed = true;
          break;
        }
        if (src[pos] === "\n") {
          line += 1;
          lineStart = pos + 1;
        }
        pos += 1;
      }
      if (!closed) {
        throw feError("コメント `/*` が `*/` で閉じられていません", startLine, startColumn);
      }
      continue;
    }

    const startPos = pos;

    // 数値リテラル (整数・小数)。
    if (isDigit(ch)) {
      while (pos < src.length && isDigit(src[pos])) {
        pos += 1;
      }
      if (src[pos] === "." && isDigit(src[pos + 1])) {
        pos += 1;
        while (pos < src.length && isDigit(src[pos])) {
          pos += 1;
        }
      }
      push("number", src.slice(startPos, pos), startPos);
      continue;
    }

    // 文字列リテラル。 `"` と `'` の両方を受ける。 改行は跨げない。
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const startColumn = column();
      pos += 1;
      let value = "";
      let closed = false;
      while (pos < src.length && src[pos] !== "\n") {
        if (src[pos] === "\\" && pos + 1 < src.length) {
          value += unescapeChar(src[pos + 1]);
          pos += 2;
          continue;
        }
        if (src[pos] === quote) {
          pos += 1;
          closed = true;
          break;
        }
        value += src[pos];
        pos += 1;
      }
      if (!closed) {
        throw feError("文字列が閉じられていません", line, startColumn);
      }
      push("string", value, startPos);
      continue;
    }

    // ASCII 識別子 / キーワード。
    if (isAsciiIdentStart(ch)) {
      while (pos < src.length && isAsciiIdentPart(src[pos])) {
        pos += 1;
      }
      const word = src.slice(startPos, pos);
      push(KEYWORDS.has(word) ? "keyword" : "ident", word, startPos);
      continue;
    }

    // 日本語の連なり。 助詞キーワードで区切る。
    if (isJapanese(ch)) {
      const particleAtStart = PARTICLES.find((p) => src.startsWith(p, pos));
      if (particleAtStart) {
        pos += particleAtStart.length;
        push("particle", particleAtStart, startPos);
        continue;
      }
      pos += 1;
      while (pos < src.length && isJapanese(src[pos])) {
        if (PARTICLES.some((p) => src.startsWith(p, pos))) {
          break;
        }
        pos += 1;
      }
      push("ident", src.slice(startPos, pos), startPos);
      continue;
    }

    // 複数文字の演算子と、 その ASCII 代替記法。
    const op = readOperator(src, pos);
    if (op) {
      pos += op.length;
      push("op", op.canonical, startPos);
      continue;
    }

    if (PUNCTS.has(ch)) {
      pos += 1;
      push("punct", ch, startPos);
      continue;
    }

    throw feError(`擬似言語で使えない文字です: \`${ch}\``, line, column());
  }

  tokens.push({ kind: "newline", value: "\n", line, column: column() });
  tokens.push({ kind: "eof", value: "", line, column: column() });
  return tokens;
}

/**
 * 演算子を 1 つ読む。 `←` `≦` などは入力しづらいので ASCII 代替記法も受理し、
 * 正規形 (擬似言語の記号) に寄せて返す。
 */
function readOperator(src: string, pos: number): { length: number; canonical: string } | null {
  const three = src.slice(pos, pos + 3);
  const two = src.slice(pos, pos + 2);
  const one = src[pos];

  // 3 文字: なし。 2 文字の代替記法を先に見る (最長一致)。
  void three;
  switch (two) {
    case "<-":
      return { length: 2, canonical: "←" };
    case "<=":
      return { length: 2, canonical: "≦" };
    case ">=":
      return { length: 2, canonical: "≧" };
    case "!=":
    case "<>":
      return { length: 2, canonical: "≠" };
    case "==":
      return { length: 2, canonical: "=" };
    default:
      break;
  }

  if (one === "*") {
    return { length: 1, canonical: "×" };
  }
  if (one === "/") {
    return { length: 1, canonical: "÷" };
  }
  if (SINGLE_OPS.has(one)) {
    return { length: 1, canonical: one };
  }
  return null;
}
