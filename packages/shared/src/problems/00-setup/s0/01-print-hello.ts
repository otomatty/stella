import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s0Ch00PrintHello: Assignment = {
  id: "S0-Ch00-01-print-hello",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 1,
  title: "console.log で文字を出す",
  newConcept: "console.log で文字列を出力する",
  estimatedMinutes: 3,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`console.log\` を使って、画面 (テスト) に **\`Hello, World!\`** という文字を出してください。

文字列は \`"\` または \`'\` で囲みます。

## 期待する出力

\`\`\`
Hello, World!
\`\`\`

## ヒント

- 関数呼び出しは \`関数名(引数)\` の形で書きます
- 文字列の中身は **大文字・小文字・記号もそのまま** 一致させる必要があります
`,
  starterFiles: singleFile(`// 文字列を console.log で出力する

`),
  tests: [
    {
      name: "stdout が Hello, World! になる",
      expectedStdout: "Hello, World!",
    },
  ],
  hints: [
    "`console.log(...)` は、丸かっこの中に書いた値を画面に出してくれる関数です。",
    "文字を出すときは、ダブルクォート (`\"`) かシングルクォート (`'`) で囲みます。",
    "`console.log(\"Hello, World!\");` のように書きます。最後のセミコロンは省略しても動きますが、書く習慣をつけると安心です。",
  ],
  solution: `console.log("Hello, World!");
`,
};
