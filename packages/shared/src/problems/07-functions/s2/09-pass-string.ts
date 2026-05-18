import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07PassString: Assignment = {
  id: "S2-Ch07-09-pass-string",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 9,
  title: "文字列引数を受けて加工して返す",
  newConcept: "文字列も普通に引数として渡せる",
  estimatedMinutes: 7,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`function shout(text) { return text + "!!!"; }\` を作り、 \`shout("Hello")\` の結果を出力してください。

## 期待する出力

\`\`\`
Hello!!!
\`\`\`

## ポイント

- 文字列の引数も \`+\` で連結したり、 \`.toUpperCase()\` などで加工できます。
`,
  starterFiles: singleFile(`// 文字列の引数を取って末尾に「!!!」 を付けて return する function 文の関数を宣言する


// 関数に説明文の文字列を渡して呼び出した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が Hello!!! になる",
      expectedStdout: "Hello!!!",
    },
  ],
  hints: [
    "`function shout(text) { return text + \"!!!\"; }` の形で作ります。",
    "呼び出した結果を `console.log` に渡します。",
    "解答例:\n```js\nfunction shout(text) {\n  return text + \"!!!\";\n}\nconsole.log(shout(\"Hello\"));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "FunctionDeclaration", label: "function 宣言を使う" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で値を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function shout(text) {
  return text + "!!!";
}
console.log(shout("Hello"));
`,
  badSolutions: [
    {
      code: `console.log("Hello!!!");
`,
      description: "関数を作らず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "function 宣言", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/function", pageTitle: "function 宣言" },
  ],
};
