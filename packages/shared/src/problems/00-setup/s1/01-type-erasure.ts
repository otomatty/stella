import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

const MDN_GRAMMAR =
  "https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Grammar_and_types";

export const s1Ch00TypeErasure: Assignment = {
  id: "S1-Ch00-013-type-erasure",
  stage: "S1",
  chapterId: "Ch00",
  sequence: 1,
  title: "型は変換時に消える",
  newConcept: "型はコンパイラーへの指示であり、実行中には残らない",
  estimatedMinutes: 7,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

「型は変換時に消える」という性質から、 次のうち **TypeScript にできないこと** はどれですか。 1 つ選び、 **その記号だけ** を \`console.log\` で表示してください。

- A. コードを書いている最中に、 型の取り違えを指摘する
- B. 実行中に外部から届いたデータが、 想定した型かどうかを自動で検査する
- C. 変換後の JavaScript を、 ブラウザで動かす

## 期待する出力

\`\`\`
B
\`\`\`

## ポイント

- 型はコンパイラーへの指示であり、 変換後の JavaScript には残りません。 そのため、 実行中に届いたデータを型が自動で検査してくれることはありません。
- 外部データの検査が必要な場合は、 自分でチェックするコードを書きます。
- A と C はどちらも TypeScript にできることです。
`,
  starterFiles: singleFile(
    `// A / B / C から 1 つ選び、 その記号だけを console.log で表示してください

`,
    "main.ts",
  ),
  tests: [
    {
      name: "選んだ記号 1 文字が出力される",
      expectedStdout: "B",
    },
  ],
  hints: [
    "「変換後の JavaScript に残らないもの」に、 実行中の仕事はできません。",
    "書いている最中のチェック (A) と、 変換後の JavaScript を動かすこと (C) は、 どちらも TypeScript の守備範囲です。",
    '解答例:\n```ts\nconsole.log("B");\n```',
  ],
  solution: `console.log("B");
`,
  badSolutions: [
    {
      code: `console.log("A");
`,
      description:
        "書いている最中の指摘を「できないこと」と誤解している（それは TypeScript の中心的な機能）",
    },
  ],
  mdnSections: [
    {
      heading: "データ型",
      pageUrl: MDN_GRAMMAR,
      pageTitle: "文法とデータ型",
    },
  ],
};
