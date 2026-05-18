import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch01Double: Assignment = {
  id: "S3-Ch01-01-double",
  stage: "S3",
  chapterId: "Ch01",
  sequence: 1,
  title: "受け取った数値を 2 倍して返す関数",
  newConcept: "関数の引数を変数として使い、 結果を return で返す",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "function",
  description: `## やること

数値 \`n\` を受け取り、 \`n\` を 2 倍した値を **返す** 関数 \`double\` を実装してください。

\`\`\`js
double(3);  // → 6
double(0);  // → 0
double(-5); // → -10
\`\`\`

## ポイント

- S3 から **\`console.log\` ではなく \`return\` で値を返す** スタイルになります。
- 引数 \`n\` はそのまま変数として使えます。 ローカル変数に入れ直す必要はありません。
- テストは関数を直接呼び出して戻り値を確認します。
`,
  starterFiles: singleFile(`function double(n) {
  // ここを実装してください
}
`),
  entryPoints: ["double"],
  demoCall: `console.log(double(3));`,
  tests: [
    { name: "double(3) は 6", code: `double(3) === 6` },
    { name: "double(0) は 0", code: `double(0) === 0` },
    { name: "double(-5) は -10", code: `double(-5) === -10` },
    { name: "double(2.5) は 5", code: `double(2.5) === 5` },
  ],
  hints: [
    "`return n * 2;` のように、 結果を `return` で返します。",
    "解答例:\n```js\nfunction double(n) {\n  return n * 2;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で値を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "console-log", label: "S3 では結果を return で返す (console.log で出力しない)" },
      ],
    },
  },
  solution: `function double(n) {
  return n * 2;
}
`,
  badSolutions: [
    {
      code: `function double(n) {
  console.log(n * 2);
}
`,
      description: "console.log で出していて return していない",
    },
    {
      code: `function double(n) {
  return 6;
}
`,
      description: "戻り値を 6 に固定してしまい n=0, -5 で fail",
    },
  ],
  mdnSections: [
    {
      heading: "関数の宣言",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/function",
      pageTitle: "function 宣言",
    },
  ],
};
