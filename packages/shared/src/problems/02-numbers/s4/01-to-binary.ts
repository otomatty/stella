import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch02ToBinary: Assignment = {
  id: "S4-Ch02-01-to-binary",
  stage: "S4",
  chapterId: "Ch02",
  sequence: 1,
  title: "10 進整数を 2 進数の文字列に変換する",
  newConcept: "while で剰余と整数除算を繰り返し、 下位桁から取り出して逆順に並べる",
  estimatedMinutes: 25,
  difficulty: 2,
  testKind: "function",
  description: `## やること

非負整数 \`n\` を受け取り、 その値を **2 進数表記** にした文字列を返す関数 \`toBinary\` を実装してください。 \`0\` は \`"0"\` を返します。

\`\`\`js
toBinary(0);    // → "0"
toBinary(1);    // → "1"
toBinary(2);    // → "10"
toBinary(13);   // → "1101"
toBinary(255);  // → "11111111"
\`\`\`

## ポイント

- \`n % 2\` で **下位 1 桁** が取り出せます (\`0\` か \`1\`)。
- \`Math.floor(n / 2)\` で **下位 1 桁を捨てた残り** が得られます。
- この 2 つを while ループで繰り返すと、 桁が **下位から順に** 取れます。 最後に **逆順** にして文字列に並べれば 2 進数表記になります。
- \`n === 0\` のときはループに入らないので特別扱いが必要です。

## 制約

- 組み込みの \`Number.prototype.toString(2)\` (基数指定) は使わずに、 自分のループで構築してください (AST で \`toString\` の呼び出しを禁止しています)。
`,
  starterFiles: singleFile(`function toBinary(n) {
  // n を 2 で割る剰余を取り出しながら 2 進数の文字列を組み立ててください
  // n === 0 のときは "0" を返す
}
`),
  entryPoints: ["toBinary"],
  demoCall: `console.log(toBinary(13));`,
  tests: [
    { name: "toBinary(0) は \"0\"", code: `toBinary(0) === "0"` },
    { name: "toBinary(1) は \"1\"", code: `toBinary(1) === "1"` },
    { name: "toBinary(2) は \"10\"", code: `toBinary(2) === "10"` },
    { name: "toBinary(5) は \"101\"", code: `toBinary(5) === "101"` },
    { name: "toBinary(13) は \"1101\"", code: `toBinary(13) === "1101"` },
    { name: "toBinary(255) は \"11111111\"", code: `toBinary(255) === "11111111"` },
    { name: "toBinary(1024) は \"10000000000\"", code: `toBinary(1024) === "10000000000"` },
    { name: "戻り値は文字列", code: `typeof toBinary(7) === "string"` },
  ],
  hints: [
    "while (n > 0) の中で digits.push(n % 2) してから n = Math.floor(n / 2) で減らしていく。",
    "ループ終了後に digits.reverse().join(\"\") で文字列にする。 n === 0 は最初に弾く。",
    "解答例:\n```js\nfunction toBinary(n) {\n  if (n === 0) {\n    return \"0\";\n  }\n  const digits = [];\n  let value = n;\n  while (value > 0) {\n    digits.push(value % 2);\n    value = Math.floor(value / 2);\n  }\n  return digits.reverse().join(\"\");\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で文字列を返す" },
        { kind: "node", nodeType: "WhileStatement", label: "while で桁を取り出す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
        { kind: "method", name: "toString", label: "toString(2) などの組み込み変換は使わない" },
      ],
    },
  },
  solution: `function toBinary(n) {
  if (n === 0) {
    return "0";
  }
  const digits = [];
  let value = n;
  while (value > 0) {
    digits.push(value % 2);
    value = Math.floor(value / 2);
  }
  return digits.reverse().join("");
}
`,
  badSolutions: [
    {
      code: `function toBinary(n) {
  return n.toString(2);
}
`,
      description: "組み込みの toString(2) で逃げている (AST forbidden 違反)",
    },
    {
      code: `function toBinary(n) {
  if (n === 0) {
    return "0";
  }
  const digits = [];
  let value = n;
  while (value > 0) {
    digits.push(value % 2);
    value = Math.floor(value / 2);
  }
  return digits.join("");
}
`,
      description: "下位桁から並べたまま reverse していない (順序が逆でテスト失敗)",
    },
    {
      code: `function toBinary(n) {
  const digits = [];
  let value = n;
  while (value > 0) {
    digits.push(value % 2);
    value = Math.floor(value / 2);
  }
  return digits.reverse().join("");
}
`,
      description: "n === 0 を特別扱いしておらず空文字を返す (toBinary(0) で失敗)",
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
      heading: "Array.prototype.reverse()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/reverse",
      pageTitle: "Array.prototype.reverse()",
    },
  ],
};
