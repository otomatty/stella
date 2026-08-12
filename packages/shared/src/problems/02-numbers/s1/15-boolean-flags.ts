import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

const MDN_GRAMMAR =
  "https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Grammar_and_types";

export const s1Ch02BooleanFlags: Assignment = {
  id: "S1-Ch02-132-boolean-flags",
  stage: "S1",
  chapterId: "Ch02",
  sequence: 15,
  title: "3 つの状態を真偽値で表す",
  newConcept: "変数名は肯定形にして、否定は false で表す",
  estimatedMinutes: 7,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次の 3 つの状態を \`boolean\` 型の変数で表し、 上から順に \`console.log\` で表示してください。 変数名は \`is\` で始めてください。

1. 支払いが完了している
2. キャンセルされていない
3. 会員である

## 期待する出力

\`\`\`
true
false
true
\`\`\`

## ポイント

- 「キャンセルされていない」は、 変数名を \`isCancelled\` にして値を \`false\` にします。
- \`isNotCancelled = true\` のように **変数名を否定形にすると**、 「否定されていない」のような二重否定が生まれて読みにくくなるため避けます。
- \`boolean\` 型に入れられるのは \`true\` と \`false\` の 2 つだけです。 クォート付きの \`"true"\` は文字列なので入れられません。
`,
  starterFiles: singleFile(
    `// 支払いが完了している


// キャンセルされていない（変数名は肯定形にする）


// 会員である


// 3 つを順に表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "3 つの状態が順に出力される",
      expectedStdout: "true\nfalse\ntrue",
    },
  ],
  hints: [
    "「支払いが完了している」は `isPaid` を `true` にします。",
    "「キャンセルされていない」は `isNotCancelled` ではなく `isCancelled` を `false` にします。",
    "解答例:\n```ts\nconst isPaid = true;\nconst isCancelled = false;\nconst isMember = true;\n\nconsole.log(isPaid);\nconsole.log(isCancelled);\nconsole.log(isMember);\n```",
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const isPaid = true;
const isCancelled = false;
const isMember = true;

console.log(isPaid);
console.log(isCancelled);
console.log(isMember);
`,
  badSolutions: [
    {
      code: `const isPaid = true;
const isNotCancelled = true;
const isMember = true;

console.log(isPaid);
console.log(isNotCancelled);
console.log(isMember);
`,
      description:
        "変数名を否定形にしたため値が true になり、 2 行目の出力が期待と食い違っている",
    },
  ],
  mdnSections: [
    {
      heading: "論理値リテラル",
      pageUrl: MDN_GRAMMAR,
      pageTitle: "文法とデータ型",
    },
    {
      heading: "データ型",
      pageUrl: MDN_GRAMMAR,
      pageTitle: "文法とデータ型",
    },
  ],
};
