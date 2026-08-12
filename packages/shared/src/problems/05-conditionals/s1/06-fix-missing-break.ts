import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch05FixMissingBreak: Assignment = {
  id: "S1-Ch05-242-fix-missing-break",
  stage: "S1",
  chapterId: "Ch05",
  sequence: 6,
  title: "break を書き忘れた switch を直す",
  newConcept: "case は入り口、 break が出口",
  estimatedMinutes: 9,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次のコードは「受付済み」だけを表示したいのに、 3 行すべて表示されます。

\`\`\`ts
const status = "received";

switch (status) {
  case "received":
    console.log("受付済み");
  case "shipped":
    console.log("発送済み");
  default:
    console.log("不明な状態");
}
\`\`\`

原因を突き止め、 「受付済み」だけが表示されるよう直してください。

## 期待する出力

\`\`\`
受付済み
\`\`\`

## ポイント

- \`break\` がないため、 最初の \`case\` に入ったあと、 そのまま下の \`case\` と \`default\` まで実行されていました。 これを **フォールスルー** と呼びます。
- \`case\` は入り口を決めるだけで、 出口を決めるのは \`break\` です。 \`case\` を書いたら必ず \`break\` をセットで書いてください。
- フォールスルーはエラーになりません。 動かすまで気づけないので、 書いた時点で癖として \`break\` を置くのが安全です。
- 1 か所だけ \`break\` を足しても足りません。 どの \`case\` から入っても正しく抜けられるようにします。
`,
  starterFiles: singleFile(
    `// 「受付済み」だけを表示したいのに 3 行すべて表示される。 原因を直すこと。

const status = "received";

switch (status) {
  case "received":
    console.log("受付済み");
  case "shipped":
    console.log("発送済み");
  default:
    console.log("不明な状態");
}
`,
    "main.ts",
  ),
  tests: [
    {
      name: "受付済みだけが出力される",
      expectedStdout: "受付済み",
    },
  ],
  hints: [
    "`switch` は当たった `case` から **下へ流れ続けます**。 どこで止めるかを書いていないのが原因です。",
    "`console.log` のあとに 1 行足すだけで止まります。 それを各 `case` に置きます。",
    '解答例:\n```ts\nconst status = "received";\n\nswitch (status) {\n  case "received":\n    console.log("受付済み");\n    break;\n  case "shipped":\n    console.log("発送済み");\n    break;\n  default:\n    console.log("不明な状態");\n}\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const status = "received";

switch (status) {
  case "received":
    console.log("受付済み");
    break;
  case "shipped":
    console.log("発送済み");
    break;
  default:
    console.log("不明な状態");
}
`,
  badSolutions: [
    {
      code: `const status = "received";

switch (status) {
  case "received":
    console.log("受付済み");
  case "shipped":
    console.log("発送済み");
    break;
  default:
    console.log("不明な状態");
}
`,
      description:
        "break を 2 つ目の case にだけ足したため、 1 つ目から入ったときのフォールスルーが残っている",
    },
  ],
  mdnSections: [
    { heading: "switch 文", anchor: "switch_文" },
    { heading: "break 文", anchor: "break_文" },
  ],
};
