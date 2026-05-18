import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch04Join: Assignment = {
  id: "S2-Ch04-06-join",
  stage: "S2",
  chapterId: "Ch04",
  sequence: 6,
  title: "join で配列を区切り文字列に変える",
  newConcept: "join(区切り) で要素を結合した 1 つの文字列を返す",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

配列 \`["apple", "banana", "cherry"]\` を **\` / \`** (前後に空白あり) で結合した文字列を出力してください。

## 期待する出力

\`\`\`
apple / banana / cherry
\`\`\`

## ポイント

- \`arr.join(" / ")\` で \`"apple / banana / cherry"\` が得られます。
- 引数を省略するとカンマ区切りになります (\`arr.join()\` = \`"apple,banana,cherry"\`)。
`,
  starterFiles: singleFile(`// 文字列の配列を const の変数に入れる


// その配列に対して join で指定の区切り文字で連結した文字列を、 console.log で出力する

`),
  tests: [
    {
      name: "stdout が apple / banana / cherry になる",
      expectedStdout: "apple / banana / cherry",
    },
  ],
  hints: [
    "`items.join(\" / \")` で結合された文字列が返ります。",
    "結果を `console.log` に渡します。",
    "解答例:\n```js\nconst items = [\"apple\", \"banana\", \"cherry\"];\nconsole.log(items.join(\" / \"));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "join", label: "join を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const items = ["apple", "banana", "cherry"];
console.log(items.join(" / "));
`,
  badSolutions: [
    {
      code: `console.log("apple / banana / cherry");
`,
      description: "join を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "Array.prototype.join()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/join", pageTitle: "Array.prototype.join()" },
  ],
};
