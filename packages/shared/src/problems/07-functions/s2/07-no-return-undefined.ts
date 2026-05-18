import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07NoReturnUndefined: Assignment = {
  id: "S2-Ch07-07-no-return-undefined",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 7,
  title: "return しない関数の戻り値は undefined",
  newConcept: "return が無い関数は undefined を返す",
  estimatedMinutes: 6,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`function shout()\` を作り、 内部で \`console.log("OK")\` だけ呼びます (return しない)。 その関数の **戻り値** を \`console.log\` で出力してください。 戻り値は \`undefined\` になるはずです。

## 期待する出力

\`\`\`
OK
undefined
\`\`\`

## ポイント

- 関数は \`return\` 文を書かなければ自動的に \`undefined\` を返します。
- これを **副作用専用の関数** と呼ぶことがあります (引数を受けて何かするだけ)。
`,
  starterFiles: singleFile(`// 中で console.log だけして return を書かない function 文の関数を宣言する


// その関数を呼び出した戻り値を、 さらに外側の console.log に渡す
// (関数本体の console.log と外側の console.log で 2 行出力されることを確認する)

`),
  tests: [
    {
      name: "stdout が OK→undefined の 2 行になる",
      expectedStdout: "OK\nundefined",
    },
  ],
  hints: [
    "関数内で `console.log(\"OK\");` だけ呼ぶ (return なし)。",
    "外側で `console.log(shout())` を呼ぶと、 OK が先に出力され、 戻り値の undefined が後から出ます。",
    "解答例:\n```js\nfunction shout() {\n  console.log(\"OK\");\n}\nconsole.log(shout());\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "FunctionDeclaration", label: "function 宣言を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function shout() {
  console.log("OK");
}
console.log(shout());
`,
  badSolutions: [
    {
      code: `console.log("OK");
console.log("undefined");
`,
      description: "関数を作らず文字列を 2 行出力している",
    },
  ],
  mdnSections: [
    { heading: "return", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/return", pageTitle: "return" },
  ],
};
