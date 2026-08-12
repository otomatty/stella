import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch05MemberRank: Assignment = {
  id: "S1-Ch05-221-member-rank",
  stage: "S1",
  chapterId: "Ch05",
  sequence: 1,
  title: "ポイントで会員ランクを分ける",
  newConcept: "if / else if / else で 3 つの道に分ける",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

会員ポイント \`point\` の値によって、 次のように表示するコードを書いてください。 今回の \`point\` は \`800\` とします。

- 500 以上 → 「ゴールド会員」
- 100 以上 500 未満 → 「シルバー会員」
- 100 未満 → 「一般会員」

## 期待する出力

\`\`\`
ゴールド会員
\`\`\`

## ポイント

- 3 つの道に分けるので \`if\` / \`else if\` / \`else\` を使います。
- 範囲で分岐するときは、 **狭い (厳しい) 条件から順に** 書きます。 逆順にすると広い条件が先に当たってしまい、 後ろの分岐に届きません。
- 「100 以上 500 未満」の条件をそのまま書く必要はありません。 500 以上をすでに \`if\` で除いてあるので、 2 つ目は \`point >= 100\` だけで足ります。
- 最後は条件を書かない \`else\` にします。 残りをすべて受け止められます。
`,
  starterFiles: singleFile(
    `// 会員ポイントを const の変数に入れる（今回は 800）


// 500 以上なら「ゴールド会員」


// 100 以上なら「シルバー会員」


// それ以外なら「一般会員」

`,
    "main.ts",
  ),
  tests: [
    {
      name: "ゴールド会員が出力される",
      expectedStdout: "ゴールド会員",
    },
  ],
  hints: [
    "まず `if (point >= ???)` の形を 1 つ書いて、 そこから `else if` と `else` を足していきます。",
    "3 つの条件のうち、 いちばん厳しいのはどれでしょうか。 それを先頭に置きます。 先頭を `point >= 100` にすると 800 もそこで止まってしまいます。",
    '解答例:\n```ts\nconst point = 800;\n\nif (point >= 500) {\n  console.log("ゴールド会員");\n} else if (point >= 100) {\n  console.log("シルバー会員");\n} else {\n  console.log("一般会員");\n}\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const point = 800;

if (point >= 500) {
  console.log("ゴールド会員");
} else if (point >= 100) {
  console.log("シルバー会員");
} else {
  console.log("一般会員");
}
`,
  badSolutions: [
    {
      code: `const point = 800;

if (point >= 100) {
  console.log("シルバー会員");
} else if (point >= 500) {
  console.log("ゴールド会員");
} else {
  console.log("一般会員");
}
`,
      description:
        "広い条件を先に書いたため、 800 が 1 つ目の分岐で確定してしまい、 ゴールド会員の分岐に届かない",
    },
  ],
  mdnSections: [
    { heading: "条件文" },
    { heading: "if...else 文", anchor: "if...else_文" },
  ],
};
