import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch01FixLiteralCase: Assignment = {
  id: "S1-Ch01-152-fix-literal-case",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 18,
  title: "リテラル型の大文字・小文字を直す",
  newConcept: "リテラル型は大文字と小文字を区別する",
  estimatedMinutes: 6,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次のコードはエラーになります。 エラーメッセージを読んで原因を確かめ、 エラーが出ないように直してください。 型のほうは変えず、 **代入する値の側** を直します。

\`\`\`ts
let seatClass: "economy" | "business" | "first" = "Economy";
console.log(seatClass);
\`\`\`

## 期待する出力

\`\`\`
economy
\`\`\`

## ポイント

- 「Type '"Economy"' is not assignable to type '"economy" | "business" | "first"'.」というエラーになります。 原因は先頭が大文字になっていることです。
- リテラル型は大文字と小文字を区別します。
- \`string\` 型なら通ってしまい、 後の条件分岐が静かに外れるところでした。 この種のタイポを実行前に潰せるのがリテラル型の価値です。
`,
  starterFiles: singleFile(
    `// このコードはエラーになります。 代入する値の側を直してください
let seatClass: "economy" | "business" | "first" = "Economy";
console.log(seatClass);
`,
    "main.ts",
  ),
  tests: [
    {
      name: "小文字に直した economy が出力される",
      expectedStdout: "economy",
    },
  ],
  hints: [
    "エラーメッセージの前半 `'\"Economy\"'` が「入れようとした値」、 後半が「受け入れ側の型」です。 見比べてください。",
    "型に並んでいる 3 つはすべて小文字で始まっています。",
    '解答例:\n```ts\nlet seatClass: "economy" | "business" | "first" = "economy";\nconsole.log(seatClass);\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `let seatClass: "economy" | "business" | "first" = "economy";
console.log(seatClass);
`,
  badSolutions: [
    {
      code: `let seatClass: string = "Economy";
console.log(seatClass);
`,
      description:
        "型を string に広げて通してしまい、 タイポを実行前に弾く仕組みを捨てている",
    },
  ],
  mdnSections: [{ heading: "文字列リテラル" }, { heading: "データ型" }],
};
