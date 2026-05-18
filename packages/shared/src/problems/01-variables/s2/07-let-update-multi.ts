import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch01LetUpdateMulti: Assignment = {
  id: "S2-Ch01-07-let-update-multi",
  stage: "S2",
  chapterId: "Ch01",
  sequence: 7,
  title: "let を 3 回連続で更新する",
  newConcept: "let なら何度でも再代入できる",
  estimatedMinutes: 6,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

スコアを段階的に増やしていく状況を再現します。

1. \`let score = 0;\` で開始
2. \`score = 10;\` に更新して \`console.log(score);\`
3. \`score = 30;\` に更新して \`console.log(score);\`
4. \`score = 100;\` に更新して \`console.log(score);\`

## 期待する出力

\`\`\`
10
30
100
\`\`\`

## ポイント

- \`let\` は何度でも再代入できます。 後から値が変わる変数には \`let\` を使います。
- \`const\` で同じことをしようとするとエラーになります。
`,
  starterFiles: singleFile(`// let で変数を宣言し、 初期値を入れる


// 説明文に書かれた段階値の順に、 値を再代入しては console.log で出力する
// (let は最初の 1 回だけ書き、 再代入時は変数名 = 値 だけ)

`),
  tests: [
    {
      name: "stdout が 10/30/100 の 3 行になる",
      expectedStdout: "10\n30\n100",
    },
  ],
  hints: [
    "再代入は `score = 10;` のように `=` で行います。 `let` は再宣言ではなく **最初の 1 回だけ** 書きます。",
    "1 回更新するごとに `console.log(score);` を入れます。",
    "解答例:\n```js\nlet score = 0;\nscore = 10;\nconsole.log(score);\nscore = 30;\nconsole.log(score);\nscore = 100;\nconsole.log(score);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "console-log",
          argument: { kind: "identifier", name: "score" },
          label: "score 変数を console.log に渡す",
        },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `let score = 0;
score = 10;
console.log(score);
score = 30;
console.log(score);
score = 100;
console.log(score);
`,
  badSolutions: [
    {
      code: `console.log(10);
console.log(30);
console.log(100);
`,
      description: "let の再代入を使わずに数値を直接出力している",
    },
  ],
  mdnSections: [
    { heading: "let", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/let", pageTitle: "let" },
  ],
};
