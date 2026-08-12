import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

const MDN_GRAMMAR =
  "https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Grammar_and_types";

export const s0Ch00FixUnterminatedString: Assignment = {
  id: "S0-Ch00-022-fix-unterminated-string",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 12,
  title: "閉じていない引用符を直す",
  newConcept: "引用符やかっこは必ず対で書く",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次のコードを実行すると、 何も表示されずエラーになります。 エラーメッセージを読んで原因を確かめ、 正しく表示されるように直してください。

\`\`\`ts
console.log("こんにちは);
\`\`\`

## 期待する出力

\`\`\`
こんにちは
\`\`\`

## ポイント

- 引用符が閉じていないことが原因です。 「Unterminated string literal.(文字列が終わっていません)」というエラーが出ます。
- 引用符やかっこは必ず対で書きます。
- 何も表示されないときは、 まずエラーメッセージを読むのが近道です。
`,
  starterFiles: singleFile(
    `// このコードはエラーになります。 正しく表示されるように直してください
console.log("こんにちは);
`,
    "main.ts",
  ),
  tests: [
    {
      name: "こんにちは が出力される",
      expectedStdout: "こんにちは",
    },
  ],
  hints: [
    "エラーメッセージの「Unterminated string literal.」は「文字列が終わっていない」という意味です。",
    "`こんにちは` の直後にも `\"` が必要です。",
    '解答例:\n```ts\nconsole.log("こんにちは");\n```',
  ],
  solution: `console.log("こんにちは");
`,
  badSolutions: [
    {
      code: `console.log("こんにちは);
`,
      description: "引用符が閉じていないままで、 構文エラーになる",
    },
  ],
  mdnSections: [
    {
      heading: "文字列リテラル",
      pageUrl: MDN_GRAMMAR,
      pageTitle: "文法とデータ型",
    },
  ],
};
