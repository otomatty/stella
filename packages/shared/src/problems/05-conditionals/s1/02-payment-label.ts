import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch05PaymentLabel: Assignment = {
  id: "S1-Ch05-222-payment-label",
  stage: "S1",
  chapterId: "Ch05",
  sequence: 2,
  title: "三項演算子で表示用の文字列を選ぶ",
  newConcept: "条件 ? 真の値 : 偽の値 なら const のまま書ける",
  estimatedMinutes: 9,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

「支払い済みかどうか」を表す \`boolean\` から、 表示用の文字列を作ってください。 支払い済みなら「支払い済み」、 そうでなければ「未払い」とします。

今回は 2 件ぶん作ります。 **どちらの変数も \`const\` のまま** 書いてください。

| 意味 | 変数名 | 値 |
| --- | --- | --- |
| 1 件目の支払い状況 | \`isPaid1\` | \`true\` |
| 2 件目の支払い状況 | \`isPaid2\` | \`false\` |

それぞれから作ったラベルを、 1 件目・2 件目の順に表示してください。

## 期待する出力

\`\`\`
支払い済み
未払い
\`\`\`

## ポイント

- 「値を選ぶ」だけなので三項演算子が向いています。 \`条件 ? 真のときの値 : 偽のときの値\` の形です。
- \`if\` で書くと \`let label;\` と宣言してから代入することになり、 \`const\` が使えなくなります。
- **コロンの左が \`true\` のとき、 右が \`false\` のときの値です。** 逆に書くと表示が入れ替わります。
`,
  starterFiles: singleFile(
    `// 1 件目の支払い状況（true）を const の変数に入れる


// 2 件目の支払い状況（false）を const の変数に入れる


// それぞれから三項演算子でラベルを作る（どちらも const）


// 1 件目・2 件目の順に表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "支払い済みと未払いが順に出力される",
      expectedStdout: "支払い済み\n未払い",
    },
  ],
  hints: [
    "`const label1 = ...;` の右側に、 `?` と `:` を使った式を 1 つ書きます。",
    "`isPaid1` が `true` のときに欲しいのはどちらの文字列でしょうか。 それを `?` のすぐ右に置きます。",
    '解答例:\n```ts\nconst isPaid1 = true;\nconst isPaid2 = false;\n\nconst label1 = isPaid1 ? "支払い済み" : "未払い";\nconst label2 = isPaid2 ? "支払い済み" : "未払い";\n\nconsole.log(label1);\nconsole.log(label2);\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const isPaid1 = true;
const isPaid2 = false;

const label1 = isPaid1 ? "支払い済み" : "未払い";
const label2 = isPaid2 ? "支払い済み" : "未払い";

console.log(label1);
console.log(label2);
`,
  badSolutions: [
    {
      code: `const isPaid1 = true;
const isPaid2 = false;

const label1 = isPaid1 ? "未払い" : "支払い済み";
const label2 = isPaid2 ? "未払い" : "支払い済み";

console.log(label1);
console.log(label2);
`,
      description:
        "コロンの左右を取り違えており、 true のときに「未払い」が選ばれてしまっている",
    },
  ],
  mdnSections: [
    { heading: "条件文" },
    { heading: "if...else 文", anchor: "if...else_文" },
  ],
};
