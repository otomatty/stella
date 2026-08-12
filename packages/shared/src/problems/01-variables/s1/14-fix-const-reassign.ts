import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch01FixConstReassign: Assignment = {
  id: "S1-Ch01-112-fix-const-reassign",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 14,
  title: "const への再代入を直す",
  newConcept: "再代入する変数は const ではなく let で宣言する",
  estimatedMinutes: 6,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次のコードはエラーになります。 どんなエラーメッセージが出るかを予想してから実行し、 実際のメッセージと見比べてください。 そのうえで、 エラーが出ないように直してください。

\`\`\`ts
const memberCount = 5;
memberCount = 6;
console.log(memberCount);
\`\`\`

## 期待する出力

\`\`\`
6
\`\`\`

## ポイント

- 元のコードでは「Cannot assign to 'memberCount' because it is a constant.」というエラーが出ます。 「定数だから代入できない」という意味です。
- 再代入が必要な変数なので、 宣言のキーワードを \`let\` に変えます。
- 2 回目に値を入れるときは \`let\` を書きません。 \`memberCount = 6;\` のように変数名と値だけを書きます。
`,
  starterFiles: singleFile(
    `// このコードはエラーになります。 エラーが出ないように直してください
const memberCount = 5;
memberCount = 6;
console.log(memberCount);
`,
    "main.ts",
  ),
  tests: [
    {
      name: "再代入後の 6 が出力される",
      expectedStdout: "6",
    },
  ],
  hints: [
    "エラーメッセージの「it is a constant」は「`const` で宣言したから」という意味です。",
    "値を入れ直したい変数は `let` で宣言します。 直すのは 1 行目だけです。",
    "解答例:\n```ts\nlet memberCount = 5;\nmemberCount = 6;\nconsole.log(memberCount);\n```",
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `let memberCount = 5;
memberCount = 6;
console.log(memberCount);
`,
  badSolutions: [
    {
      code: `let memberCount = 5;
let memberCount = 6;
console.log(memberCount);
`,
      description: "2 行目にも let を付けてしまい、 同じ名前を二度宣言している",
    },
  ],
  mdnSections: [{ heading: "定数" }, { heading: "宣言と初期化" }],
};
