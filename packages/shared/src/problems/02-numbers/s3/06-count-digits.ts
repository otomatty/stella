import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch02CountDigits: Assignment = {
  id: "S3-Ch02-06-count-digits",
  stage: "S3",
  chapterId: "Ch02",
  sequence: 6,
  title: "整数の桁数を数える",
  newConcept: "while ループで値を 10 で割って桁を取り出す",
  estimatedMinutes: 15,
  difficulty: 2,
  testKind: "function",
  description: `## やること

非負整数 \`n\` を受け取り、 その桁数を返す関数 \`countDigits\` を実装してください。 \`0\` は 1 桁とします。

\`\`\`js
countDigits(0);     // → 1
countDigits(5);     // → 1
countDigits(42);    // → 2
countDigits(1000);  // → 4
countDigits(99999); // → 5
\`\`\`

## ポイント

- \`while (n > 0) { n = Math.floor(n / 10); count++; }\` のループで桁を 1 つずつ削れます。
- 文字列に変換して \`.length\` を取る方法もありますが、 ここでは数値演算で実装してみましょう。
- \`n === 0\` のときは特別扱いが必要です。
`,
  starterFiles: singleFile(`function countDigits(n) {
  // ここを実装してください
}
`),
  entryPoints: ["countDigits"],
  demoCall: `console.log(countDigits(12345));`,
  tests: [
    { name: "countDigits(0) は 1", code: `countDigits(0) === 1` },
    { name: "countDigits(5) は 1", code: `countDigits(5) === 1` },
    { name: "countDigits(42) は 2", code: `countDigits(42) === 2` },
    { name: "countDigits(1000) は 4", code: `countDigits(1000) === 4` },
    { name: "countDigits(99999) は 5", code: `countDigits(99999) === 5` },
    { name: "countDigits(1234567) は 7", code: `countDigits(1234567) === 7` },
  ],
  hints: [
    "n が 0 のときは 1 を返す (特殊ケース)。",
    "while で n を 10 で割りながら回数を数える。",
    "解答例:\n```js\nfunction countDigits(n) {\n  if (n === 0) return 1;\n  let count = 0;\n  while (n > 0) {\n    n = Math.floor(n / 10);\n    count++;\n  }\n  return count;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で桁数を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function countDigits(n) {
  if (n === 0) {
    return 1;
  }
  let count = 0;
  let value = n;
  while (value > 0) {
    value = Math.floor(value / 10);
    count++;
  }
  return count;
}
`,
  badSolutions: [
    {
      code: `function countDigits(n) {
  let count = 0;
  while (n > 0) {
    n = Math.floor(n / 10);
    count++;
  }
  return count;
}
`,
      description: "n === 0 のケースで 0 を返してしまう (期待は 1)",
    },
    {
      code: `function countDigits(n) {
  return 1;
}
`,
      description: "常に 1 を返している",
    },
  ],
  mdnSections: [
    {
      heading: "while 文",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/while",
      pageTitle: "while",
    },
  ],
};
