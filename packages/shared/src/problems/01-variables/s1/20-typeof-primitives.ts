import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

const MDN_EXPRESSIONS =
  "https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Expressions_and_operators";

export const s1Ch01TypeofPrimitives: Assignment = {
  id: "S1-Ch01-162-typeof-primitives",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 20,
  title: "typeof の結果を確かめる",
  newConcept: "typeof null は \"object\" を返す",
  estimatedMinutes: 7,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次の 5 行の出力を **予想してから** 同じコードを書いて実行し、 予想と見比べてください。

\`\`\`ts
console.log(typeof 480);
console.log(typeof "480");
console.log(typeof true);
console.log(typeof undefined);
console.log(typeof null);
\`\`\`

## 期待する出力

\`\`\`
number
string
boolean
undefined
object
\`\`\`

## ポイント

- 最後の 1 行だけが直感に反します。 \`typeof null\` は \`"null"\` ではなく \`"object"\` を返します。
- JavaScript 初期からのバグで、 互換性のために修正されずに残っているものです。
- このため、 \`null\` かどうかの判定に \`typeof\` を使ってはいけません。 \`value === null\` と直接比較します。
`,
  starterFiles: singleFile(
    `// 出力を予想してから、 次の 5 つの typeof の結果を順に表示してください
// 480 / "480" / true / undefined / null

`,
    "main.ts",
  ),
  tests: [
    {
      name: "5 つの typeof の結果が順に出力される",
      expectedStdout: "number\nstring\nboolean\nundefined\nobject",
    },
  ],
  hints: [
    "`typeof` は値の前に書くだけで使えます。 `console.log(typeof 480);` のように書きます。",
    "`typeof undefined` と `typeof null` は結果が違います。 片方だけ直感に反する結果になります。",
    '解答例:\n```ts\nconsole.log(typeof 480);\nconsole.log(typeof "480");\nconsole.log(typeof true);\nconsole.log(typeof undefined);\nconsole.log(typeof null);\n```',
  ],
  solution: `console.log(typeof 480);
console.log(typeof "480");
console.log(typeof true);
console.log(typeof undefined);
console.log(typeof null);
`,
  badSolutions: [
    {
      code: `console.log(typeof 480);
console.log(typeof "480");
console.log(typeof true);
console.log(typeof undefined);
console.log("null");
`,
      description:
        "typeof null は \"null\" になると思い込み、 最後の行だけ予想を直接書いてしまっている",
    },
  ],
  mdnSections: [
    { heading: "データ型" },
    {
      heading: "typeof",
      pageUrl: MDN_EXPRESSIONS,
      pageTitle: "式と演算子",
    },
  ],
};
