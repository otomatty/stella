import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch02ToBaseCapstone: Assignment = {
  id: "S4-Ch02-04-to-base-capstone",
  stage: "S4",
  chapterId: "Ch02",
  sequence: 4,
  title: "[卒業課題] 10 進整数を任意の基数の文字列に変換する",
  newConcept: "「桁を取り出す → 数字を文字に対応付ける → 連結」 という進数変換のパイプラインを組み立てる",
  estimatedMinutes: 40,
  difficulty: 3,
  testKind: "function",
  isCapstone: true,
  description: `## やること

非負整数 \`n\` と基数 \`base\` (\`2 <= base <= 16\` を前提) を受け取り、 \`n\` を \`base\` 進数で表記した文字列を返す関数 \`toBase\` を実装してください。 \`a\` 〜 \`f\` は **小文字** で出力します。 \`n === 0\` のときは \`"0"\` を返します。

\`\`\`js
toBase(0, 2);      // → "0"
toBase(13, 2);     // → "1101"
toBase(255, 2);    // → "11111111"
toBase(8, 8);      // → "10"
toBase(100, 10);   // → "100"
toBase(255, 16);   // → "ff"
toBase(2748, 16);  // → "abc"
\`\`\`

## ポイント

- **これは S4 卒業課題のひとつ**。 進数変換を 3 段のパイプラインで組み立てます。

  1. **桁を取り出す**: \`value % base\` で「\`base\` 進数の下位 1 桁 (数値)」 が得られる
  2. **数字を文字に対応付ける**: 文字列 \`"0123456789abcdef"\` のインデックスを使うのが簡単 (例: \`"0123456789abcdef"[10] === "a"\`)
  3. **連結**: 下位桁から取れるので、 結果の **先頭に** 追加していくと自然な順序になる (\`result = chars[digit] + result\`)

- \`while (value > 0)\` で割り進め、 \`value = Math.floor(value / base)\` で次の桁へ。
- \`n === 0\` はループに入らないので、 最初に \`"0"\` を返す特別扱いが必要です。
- 組み込みの \`Number.prototype.toString(base)\` を使うと逃げられてしまうため、 AST で **\`toString\` の呼び出しを禁止** しています。
`,
  starterFiles: singleFile(`function toBase(n, base) {
  // n が 0 のときは説明文の特別扱いに従って文字列を return する


  // 0-9 と a-f を並べた変換表の文字列と、 結果用の文字列、 走査用の数値変数を用意する


  // while で走査用変数が 0 より大きい間ループする


  // 剰余で下位 1 桁の数値を取り出して、 対応する変換表の文字を結果文字列の先頭側に積む


  // 走査用変数を Math.floor で base で割って次の桁に進める


  // ループを抜けたら結果文字列を return する
}
`),
  entryPoints: ["toBase"],
  demoCall: `console.log(toBase(255, 16));`,
  tests: [
    { name: "toBase(0, 2) は \"0\"", code: `toBase(0, 2) === "0"` },
    { name: "toBase(0, 16) は \"0\"", code: `toBase(0, 16) === "0"` },
    { name: "toBase(1, 2) は \"1\"", code: `toBase(1, 2) === "1"` },
    { name: "toBase(13, 2) は \"1101\"", code: `toBase(13, 2) === "1101"` },
    { name: "toBase(255, 2) は \"11111111\"", code: `toBase(255, 2) === "11111111"` },
    { name: "toBase(8, 8) は \"10\"", code: `toBase(8, 8) === "10"` },
    { name: "toBase(100, 10) は \"100\"", code: `toBase(100, 10) === "100"` },
    { name: "toBase(255, 16) は \"ff\"", code: `toBase(255, 16) === "ff"` },
    { name: "toBase(2748, 16) は \"abc\"", code: `toBase(2748, 16) === "abc"` },
    { name: "toBase(15, 16) は \"f\"", code: `toBase(15, 16) === "f"` },
    { name: "戻り値は文字列", code: `typeof toBase(42, 10) === "string"` },
  ],
  hints: [
    "chars = \"0123456789abcdef\" を用意して、 while (value > 0) で value % base のインデックスの文字を取り出す。",
    "下位桁から取れるので result = chars[digit] + result と先頭に積む。 n === 0 の特殊ケースを忘れずに。",
    "解答例:\n```js\nfunction toBase(n, base) {\n  if (n === 0) {\n    return \"0\";\n  }\n  const chars = \"0123456789abcdef\";\n  let result = \"\";\n  let value = n;\n  while (value > 0) {\n    const digit = value % base;\n    result = chars[digit] + result;\n    value = Math.floor(value / base);\n  }\n  return result;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で文字列を返す" },
        { kind: "node", nodeType: "WhileStatement", label: "while で桁を取り出すループ" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
        { kind: "method", name: "toString", label: "toString(base) などの組み込み変換は使わない" },
      ],
    },
  },
  solution: `function toBase(n, base) {
  if (n === 0) {
    return "0";
  }
  const chars = "0123456789abcdef";
  let result = "";
  let value = n;
  while (value > 0) {
    const digit = value % base;
    result = chars[digit] + result;
    value = Math.floor(value / base);
  }
  return result;
}
`,
  badSolutions: [
    {
      code: `function toBase(n, base) {
  return n.toString(base);
}
`,
      description: "組み込みの toString(base) で逃げている (AST forbidden 違反)",
    },
    {
      code: `function toBase(n, base) {
  const chars = "0123456789abcdef";
  let result = "";
  let value = n;
  while (value > 0) {
    const digit = value % base;
    result = chars[digit] + result;
    value = Math.floor(value / base);
  }
  return result;
}
`,
      description: "n === 0 のときに空文字を返してしまう (toBase(0, 2) で失敗)",
    },
    {
      code: `function toBase(n, base) {
  if (n === 0) {
    return "0";
  }
  const chars = "0123456789abcdef";
  let result = "";
  let value = n;
  while (value > 0) {
    const digit = value % base;
    result = result + chars[digit];
    value = Math.floor(value / base);
  }
  return result;
}
`,
      description: "下位桁を末尾に追加していて文字列が逆順になる (toBase(13, 2) が \"1011\" になる)",
    },
  ],
  mdnSections: [
    {
      heading: "剰余 (%)",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Remainder",
      pageTitle: "剰余 (%)",
    },
    {
      heading: "Math.floor()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Math/floor",
      pageTitle: "Math.floor()",
    },
    {
      heading: "while 文",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/while",
      pageTitle: "while",
    },
  ],
};
