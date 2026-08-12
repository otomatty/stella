import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch05RangeNeedsIf: Assignment = {
  id: "S2-Ch05-243-range-needs-if",
  stage: "S2",
  chapterId: "Ch05",
  sequence: 18,
  title: "範囲の条件は switch では書けない",
  newConcept: "case は等価比較のみ。 範囲は if / else if",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

会員ポイントによって割引率を表示するコードを書いてください。 今回の \`point\` は \`250\` とします。

- 500 以上 → 「20%割引」
- 100 以上 500 未満 → 「10%割引」
- 100 未満 → 「割引なし」

ここでは \`switch\` ではなく **\`if\` / \`else if\` / \`else\`** で書いてください。 \`switch\` の \`case\` は **等価比較 (\`===\`) でしか判定できない** ため、「500 以上」のような範囲の条件は \`case\` に書けないからです。

## 期待する出力

\`\`\`
10%割引
\`\`\`

## ポイント

- 使い分けはこうなります。
  - 決まった候補と一致するか → \`switch\`
  - 範囲や複数条件 → \`if\` / \`else if\`
- \`switch (point) { case point >= 500: ... }\` と書いても動きません。 \`point >= 500\` はまず \`true\` / \`false\` に計算され、 それを \`point\` (数値) と比べることになるため、 どの \`case\` にも当たりません。
- 範囲の分岐は大きいほうから順に \`>=\` で並べます。
`,
  starterFiles: singleFile(
    `// 会員ポイントを const の変数に入れる（今回は 250）


// 500 以上なら「20%割引」、 100 以上なら「10%割引」、 それ以外は「割引なし」
// case は等価比較しかできないので、 if / else if / else で書くこと

`,
    "main.ts",
  ),
  tests: [
    {
      name: "10%割引が出力される",
      expectedStdout: "10%割引",
    },
  ],
  hints: [
    "範囲で分ける分岐は、 しきい値の **大きいほうから順に `>=` で並べる** と考えやすくなります。 最後は条件を書かない `else` で残りを受け止めます。",
    "`switch` で書きたくなったら、 `case` の右に書けるのは **値そのもの** だけだと思い出してください。 比較の式は書けません。",
    '解答例:\n```ts\nconst point = 250;\n\nif (point >= 500) {\n  console.log("20%割引");\n} else if (point >= 100) {\n  console.log("10%割引");\n} else {\n  console.log("割引なし");\n}\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const point = 250;

if (point >= 500) {
  console.log("20%割引");
} else if (point >= 100) {
  console.log("10%割引");
} else {
  console.log("割引なし");
}
`,
  badSolutions: [
    {
      code: `const point = 250;

switch (point) {
  case point >= 500:
    console.log("20%割引");
    break;
  case point >= 100:
    console.log("10%割引");
    break;
  default:
    console.log("割引なし");
}
`,
      description:
        "範囲の条件を case に書いてしまい、 比較結果の true / false が数値の point と比べられるため、 どの case にも当たらず default に落ちる",
    },
  ],
  mdnSections: [
    { heading: "switch 文", anchor: "switch_文" },
    { heading: "条件文" },
  ],
};
