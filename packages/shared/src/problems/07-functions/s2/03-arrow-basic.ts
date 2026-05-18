import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07ArrowBasic: Assignment = {
  id: "S2-Ch07-03-arrow-basic",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 3,
  title: "アロー関数で値を返す",
  newConcept: "アロー関数 () => 式 の暗黙 return",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

アロー関数で \`hello\` を作り、 \`"Hello"\` を返すようにします。 \`hello()\` を呼んで結果を出力してください。

\`\`\`js
const hello = () => "Hello";
\`\`\`

## 期待する出力

\`\`\`
Hello
\`\`\`

## ポイント

- アロー関数: \`() => 値\` の形は **その値を return する** という意味。
- \`{ }\` を書くと中身は通常の関数本体になり、 \`return\` が必要になります。
`,
  starterFiles: singleFile(`// 引数を取らないアロー関数を const の変数に入れる
// (式形式 () => 値 で、 値をそのまま返すようにする)


// 関数を呼び出した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が Hello になる",
      expectedStdout: "Hello",
    },
  ],
  hints: [
    "`const hello = () => \"Hello\";` で簡単に作れます。",
    "`hello()` を呼んで結果を `console.log` に渡します。",
    "解答例:\n```js\nconst hello = () => \"Hello\";\nconsole.log(hello());\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ArrowFunctionExpression", label: "アロー関数を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const hello = () => "Hello";
console.log(hello());
`,
  badSolutions: [
    {
      code: `console.log("Hello");
`,
      description: "アロー関数を使わず直接出力している",
    },
  ],
  mdnSections: [
    { heading: "アロー関数式", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Functions/Arrow_functions", pageTitle: "アロー関数式" },
  ],
};
