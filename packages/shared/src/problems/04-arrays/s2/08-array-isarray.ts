import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch04ArrayIsArray: Assignment = {
  id: "S2-Ch04-08-array-isarray",
  stage: "S2",
  chapterId: "Ch04",
  sequence: 8,
  title: "Array.isArray で配列か判定する",
  newConcept: "typeof では区別できない配列を Array.isArray で確認する",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`[1, 2, 3]\` が配列かどうかを \`Array.isArray\` で判定し、 結果を出力してください。

## 期待する出力

\`\`\`
true
\`\`\`

## ポイント

- \`typeof [1,2,3]\` は \`"object"\` で配列かどうか分かりません。
- \`Array.isArray\` を使えば配列かどうかを **\`true\` / \`false\` で正確に判定** できます。
`,
  starterFiles: singleFile(`// 値を const の変数に入れる


// その変数を Array.isArray に渡した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が true になる",
      expectedStdout: "true",
    },
  ],
  hints: [
    "`Array.isArray(値)` の形で呼びます。",
    "配列なら `true`、 それ以外なら `false`。",
    "解答例:\n```js\nconst value = [1, 2, 3];\nconsole.log(Array.isArray(value));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "const-declaration", name: "value", label: "const value を宣言する" },
        { kind: "method", name: "isArray", label: "Array.isArray を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const value = [1, 2, 3];
console.log(Array.isArray(value));
`,
  badSolutions: [
    {
      code: `console.log(true);
`,
      description: "Array.isArray を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "Array.isArray()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray", pageTitle: "Array.isArray()" },
  ],
};
