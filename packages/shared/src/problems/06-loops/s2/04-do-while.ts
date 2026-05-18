import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch06DoWhile: Assignment = {
  id: "S2-Ch06-04-do-while",
  stage: "S2",
  chapterId: "Ch06",
  sequence: 4,
  title: "do-while で最低 1 回実行する",
  newConcept: "do-while は条件チェックが末尾なので最低 1 回は実行される",
  estimatedMinutes: 8,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

\`do-while\` ループで \`10\`、 \`20\`、 \`30\` の 3 行を出力してください。

\`\`\`js
let i = 1;
do {
  console.log(i * 10);
  i++;
} while (i <= 3);
\`\`\`

## 期待する出力

\`\`\`
10
20
30
\`\`\`

## ポイント

- \`do { ... } while (条件);\` は **末尾** で条件を判定します。
- そのため **条件が最初から偽** でもブロックは 1 回実行されます。
- 最後にセミコロン \`;\` を忘れない。
`,
  starterFiles: singleFile(`// do { ... } while (条件) の形で、 中で計算結果を console.log で出力してからカウンタを更新する
// (カウンタは事前に let で初期化しておく)

`),
  tests: [
    {
      name: "stdout が 10/20/30 の 3 行になる",
      expectedStdout: "10\n20\n30",
    },
  ],
  hints: [
    "`do { ... } while (条件);` の形で書きます。",
    "ブロックの中で `i * 10` を出力し、 `i` をインクリメントします。",
    "解答例:\n```js\nlet i = 1;\ndo {\n  console.log(i * 10);\n  i++;\n} while (i <= 3);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "DoWhileStatement", label: "do-while ループを使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `let i = 1;
do {
  console.log(i * 10);
  i++;
} while (i <= 3);
`,
  badSolutions: [
    {
      code: `console.log(10);
console.log(20);
console.log(30);
`,
      description: "do-while を使わず 1 行ずつ console.log している",
    },
  ],
  mdnSections: [
    { heading: "do...while", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/do...while", pageTitle: "do...while" },
  ],
};
