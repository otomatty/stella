import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch01StoreCalcResult: Assignment = {
  id: "S1-Ch01-08-store-calc-result",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 8,
  title: "演算結果を変数に入れる",
  newConcept: "= の右側には計算式も書ける。 結果が変数に入る",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

次の手順で計算結果を変数に入れて出力してください。

1. \`a\` に \`12\`、 \`b\` に \`8\` を const で入れる
2. \`sum\` という変数に \`a + b\` の結果を入れる
3. \`sum\` を console.log で出力する

## 期待する出力

\`\`\`
20
\`\`\`

## ポイント

- \`=\` の右側には数値だけでなく **計算式** も書けます。
- \`const sum = a + b;\` のように書くと、 計算結果 \`20\` が \`sum\` に入ります。
`,
  starterFiles: singleFile(`// 2 つの数値を、 それぞれ const の変数に入れる


// 上の 2 変数を + で足し算した結果を、 さらに別の const の変数に入れる
// (答えを直接書かずに、 計算式のまま入れる)


// 計算結果を入れた変数を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 20 になる",
      expectedStdout: "20",
    },
  ],
  hints: [
    "計算式は `=` の右側に書けます。 例: `const x = 1 + 2;` で `x` は `3` になります。",
    "`a + b` を `sum` に入れると、 入った時点で計算結果が固定されます。",
    "解答例:\n```js\nconst a = 12;\nconst b = 8;\nconst sum = a + b;\nconsole.log(sum);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "const-declaration",
          name: "sum",
          label: "const sum を宣言する",
        },
        {
          kind: "console-log",
          argument: { kind: "identifier", name: "sum" },
          label: "sum 変数を console.log に渡す",
        },
      ],
    },
  },
  solution: `const a = 12;
const b = 8;
const sum = a + b;
console.log(sum);
`,
  badSolutions: [
    {
      code: `const a = 12;
const b = 8;
console.log(a + b);
`,
      description: "結果を sum に入れずに直接 console.log で計算している",
    },
  ],
};
