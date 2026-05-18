import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s0Ch00PrintName: Assignment = {
  id: "S0-Ch00-02-print-name",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 2,
  title: "自分の名前を出す",
  newConcept: "好きな文字列を console.log に渡す",
  estimatedMinutes: 3,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`console.log\` で **\`Taro\`** という文字を出してください。

(本来は「自分の名前」を出すのが目的ですが、自動採点のため、ここでは固定の \`Taro\` で確認します。)

## 期待する出力

\`\`\`
Taro
\`\`\`

## ヒント

- 1 問目の \`Hello, World!\` を出したコードを思い出してみましょう。
- \`console.log\` に渡す文字列を変えるだけです。
`,
  starterFiles: singleFile(`// console.log で「Taro」を出力してください
// 1 問目と同じ書き方で、文字列だけ差し替えれば OK です
`),
  tests: [
    {
      name: "stdout が Taro になる",
      expectedStdout: "Taro",
    },
  ],
  hints: [
    "1 問目で書いた `console.log(\"…\");` の中身を `Taro` に変えます。",
    "文字列を `\"` で囲むのを忘れずに。`console.log(Taro)` だと「Taro という変数」を探してエラーになります。",
    "`console.log(\"Taro\");` と書きます。",
  ],
  solution: `console.log("Taro");
`,
};
