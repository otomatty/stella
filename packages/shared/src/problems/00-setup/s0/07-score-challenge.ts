import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s0Ch00ScoreChallenge: Assignment = {
  id: "S0-Ch00-07-score-challenge",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 7,
  title: "[チャレンジ] 教科名と合計点を 2 行で出す",
  newConcept: "S0 で習った const / 数値計算 / 複数行出力 を組み合わせる",
  estimatedMinutes: 5,
  difficulty: 2,
  testKind: "stdout",
  isCapstone: true,
  description: `## やること

これまで S0 で学んだ 3 つを **同時に** 使う **チャレンジ問題** です。

- \`const\` で変数に値を入れる
- 数値の足し算を計算する
- \`console.log\` を 2 回呼んで 2 行で出力する

次のように書いてください。

- \`subject\`: 教科名 (\`"JavaScript"\`)
- \`total\`: 2 つのテストの合計点 (\`80 + 15\` の計算結果)

\`subject\` と \`total\` をこの順で 2 行に分けて出力します。

## 期待する出力

\`\`\`
JavaScript
95
\`\`\`

## ヒント

- \`const subject = "JavaScript";\` のように、 文字列を変数に入れます。
- \`const total = 80 + 15;\` のように、 計算結果も変数に入れられます。
- \`console.log\` を 2 回呼ぶと、 2 行に分かれて出力されます。
`,
  starterFiles: singleFile(`// 教科名を const の変数に入れる


// 2 つのテストの点数を + で足し算して、 計算結果を const の変数に入れる
// (答えを直接書かずに、計算式のまま入れる)


// 1 つ目の変数を console.log で出力する


// 2 つ目の変数を console.log で出力する

`),
  tests: [
    {
      name: "stdout が JavaScript と 95 の 2 行になる",
      expectedStdout: "JavaScript\n95",
    },
  ],
  hints: [
    "`const subject = \"JavaScript\";` のように、 文字列を const に入れます。",
    "`const total = 80 + 15;` のように、 計算結果を const に入れます。 値は計算後に固定されます。",
    "解答例:\n```js\nconst subject = \"JavaScript\";\nconst total = 80 + 15;\nconsole.log(subject);\nconsole.log(total);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "const-declaration",
          name: "subject",
          label: "const subject を宣言する",
        },
        {
          kind: "const-declaration",
          name: "total",
          label: "const total を宣言する",
        },
        {
          kind: "node",
          nodeType: "BinaryExpression",
          label: "+ で計算してから total に入れる",
        },
        {
          kind: "console-log",
          argument: { kind: "identifier", name: "subject" },
          label: "subject を console.log に渡す",
        },
        {
          kind: "console-log",
          argument: { kind: "identifier", name: "total" },
          label: "total を console.log に渡す",
        },
      ],
    },
  },
  solution: `const subject = "JavaScript";
const total = 80 + 15;
console.log(subject);
console.log(total);
`,
  badSolutions: [
    {
      code: `console.log("JavaScript");
console.log(95);
`,
      description: "const 変数を使わず文字列と数値を直接出力している",
    },
    {
      code: `console.log("JavaScript\\n95");
`,
      description: "console.log を 2 回呼ばず 1 回で 2 行出力している",
    },
    {
      code: `const subject = "JavaScript";
const total = 95;
console.log(subject);
console.log(total);
`,
      description: "total を計算式 (80 + 15) ではなく結果の 95 で初期化している",
    },
  ],
};
