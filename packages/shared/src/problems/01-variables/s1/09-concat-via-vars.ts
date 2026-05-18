import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch01ConcatViaVars: Assignment = {
  id: "S1-Ch01-09-concat-via-vars",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 9,
  title: "変数同士を + で連結する",
  newConcept: "文字列の変数も + で連結できる",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

次の 2 つの変数を作り、 \`+\` で連結した結果を出力してください。

- \`hello\`: \`"こんにちは、 "\`
- \`name\`: \`"太郎さん"\`

\`hello + name\` の結果を \`greeting\` に入れて、 それを出力します。

## 期待する出力

\`\`\`
こんにちは、 太郎さん
\`\`\`

## ポイント

- 文字列同士は \`+\` でつなげられます。 これを **連結** と言います。
- \`"a" + "b"\` は \`"ab"\` になります。
`,
  starterFiles: singleFile(`// 2 つの文字列を、 それぞれ const の変数に入れる


// 上の 2 変数を + で連結した結果を、 さらに別の const の変数に入れる


// 連結結果を入れた変数を console.log で出力する

`),
  tests: [
    {
      name: "stdout が連結された挨拶文になる",
      expectedStdout: "こんにちは、 太郎さん",
    },
  ],
  hints: [
    "数値の `+` は足し算ですが、 文字列の `+` はつなげる (連結する) 操作になります。",
    "`hello + name` の結果が `\"こんにちは、 太郎さん\"` という 1 つの文字列になります。",
    "解答例:\n```js\nconst hello = \"こんにちは、 \";\nconst name = \"太郎さん\";\nconst greeting = hello + name;\nconsole.log(greeting);\n```",
  ],
  solution: `const hello = "こんにちは、 ";
const name = "太郎さん";
const greeting = hello + name;
console.log(greeting);
`,
};
