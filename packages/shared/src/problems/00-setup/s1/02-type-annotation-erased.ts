import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

const MDN_GRAMMAR =
  "https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Grammar_and_types";

export const s1Ch00TypeAnnotationErased: Assignment = {
  id: "S1-Ch00-023-type-annotation-erased",
  stage: "S1",
  chapterId: "Ch00",
  sequence: 2,
  title: "変換後の JavaScript から消えるもの",
  newConcept: "型注釈はチェックが終われば役目を終え、変換後には残らない",
  estimatedMinutes: 8,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次のコードをそのまま書いて実行し、 2 行の出力を確認してください。

\`\`\`ts
const shopName: string = "青山コーヒー店";
const price: number = 480;
console.log(shopName);
console.log(price);
\`\`\`

そのうえで、 **変換後の JavaScript から消えているもの** はどれかを 1 つ選び、 **その記号** を 3 行目として \`console.log\` で表示してください。

- A. 変数名
- B. 型注釈 (\`: string\` と \`: number\`)
- C. \`console.log\`

## 期待する出力

\`\`\`
青山コーヒー店
480
B
\`\`\`

## ポイント

- 型はコンパイラーに「この変数には何が入るか」を伝えるための情報です。 チェックが終われば役目は終わるので、 変換後の JavaScript には残りません。
- 変数名も \`console.log\` も、 実行に必要なのでそのまま残ります。
- だからこそ、 型は実行中のデータを守ってはくれません。 開発中に間違いを見つけるための道具です。
`,
  starterFiles: singleFile(
    `// 1) 型注釈付きで shopName と price を宣言し、 順に表示する


// 2) 変換後の JavaScript から消えているものの記号を表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "2 つの値と選んだ記号が出力される",
      expectedStdout: "青山コーヒー店\n480\nB",
    },
  ],
  hints: [
    "まずは元のコードを型注釈ごとそのまま書き写して、 2 行の出力を確認します。",
    "実行に必要なものは残り、 チェックのためだけにあるものは消えます。",
    '解答例:\n```ts\nconst shopName: string = "青山コーヒー店";\nconst price: number = 480;\nconsole.log(shopName);\nconsole.log(price);\nconsole.log("B");\n```',
  ],
  solution: `const shopName: string = "青山コーヒー店";
const price: number = 480;
console.log(shopName);
console.log(price);
console.log("B");
`,
  badSolutions: [
    {
      code: `const shopName: string = "青山コーヒー店";
const price: number = 480;
console.log(shopName);
console.log(price);
console.log("C");
`,
      description:
        "console.log が消えると誤解している（実行に必要なので変換後も残る）",
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
