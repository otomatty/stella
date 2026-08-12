import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

const MDN_GRAMMAR =
  "https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Grammar_and_types";

export const s0Ch00ErrorTiming: Assignment = {
  id: "S0-Ch00-012-error-timing",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 10,
  title: "型の取り違えに気づけるのはいつか",
  newConcept: "型注釈があると、実行する前に取り違えを指摘してもらえる",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

「文字列と数値を取り違える」という同じ間違いを TypeScript で書くと、 次のようになります。

\`\`\`ts
const price: number = "300";
\`\`\`

この間違いに気づけるのは、 どの段階ですか。 もっとも近いものを 1 つ選び、 **その記号だけ** を \`console.log\` で表示してください。

- A. 本番で顧客が見つけたとき
- B. テストで動かしたとき
- C. 書いている最中

## 期待する出力

\`\`\`
C
\`\`\`

## ポイント

- \`: number\` と宣言してあるので、 文字列 \`"300"\` を入れようとした時点でコンパイラーが「Type 'string' is not assignable to type 'number'.」というエラーを出します。 実行する必要はありません。
- エディター上で赤い波線が出るのは、 まだ一度もコードを動かしていない段階です。 ここが TypeScript の中心的な価値です。
- バグは気づくのが早いほど、 直す手間が小さくなります。
`,
  starterFiles: singleFile(
    `// A / B / C から 1 つ選び、 その記号だけを console.log で表示してください

`,
    "main.ts",
  ),
  tests: [
    {
      name: "選んだ記号 1 文字が出力される",
      expectedStdout: "C",
    },
  ],
  hints: [
    "`: number` と書いた変数に文字列を入れると、 コンパイラーがその場でエラーを出します。",
    "赤い波線が出るのは、 まだ一度もコードを動かしていない段階です。",
    '解答例:\n```ts\nconsole.log("C");\n```',
  ],
  solution: `console.log("C");
`,
  badSolutions: [
    {
      code: `console.log("B");
`,
      description:
        "テストで動かすまで気づけないと考えている（型エラーは実行する前に出る）",
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
