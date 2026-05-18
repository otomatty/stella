import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch04CopyViaSlice: Assignment = {
  id: "S2-Ch04-09-copy-via-slice",
  stage: "S2",
  chapterId: "Ch04",
  sequence: 9,
  title: "slice() で配列のコピーを作る",
  newConcept: "slice() (引数なし) は配列の浅いコピーを返す",
  estimatedMinutes: 7,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

配列 \`[1, 2, 3]\` を \`slice()\` でコピーし、 コピー側に \`4\` を \`push\` で追加します。 **元の配列は変わらず**、 **コピー側だけ** \`[1, 2, 3, 4]\` になっていることを確かめてください。

\`\`\`
copy : [1, 2, 3, 4]
original : [1, 2, 3]
\`\`\` の 2 行を出力します。

## 期待する出力

\`\`\`
copy: [1,2,3,4]
original: [1,2,3]
\`\`\`

## ポイント

- \`arr.slice()\` (引数なし) は配列を **複製** します。
- コピー側を変更しても、 元配列には影響しません。
`,
  starterFiles: singleFile(`// 元になる数値の配列を const の変数に入れる


// その配列に slice() を呼んでコピーを作り、 別の const の変数に入れる


// コピー側にだけ push で要素を追加する


// テンプレートリテラルで「copy: ...」「original: ...」 の 2 行を console.log で出力する
// (配列の中身を埋め込むには JSON.stringify を使うとよい)

`),
  tests: [
    {
      name: "stdout が copy: [1,2,3,4]→original: [1,2,3] の 2 行になる",
      expectedStdout: "copy: [1,2,3,4]\noriginal: [1,2,3]",
    },
  ],
  hints: [
    "`original.slice()` で配列をコピーします。",
    "コピー側にだけ `push(4)` してから、 両方を出力します。 `console.log(\\`copy: ${JSON.stringify(copy)}\\`)` のように使うと簡単です。",
    "解答例:\n```js\nconst original = [1, 2, 3];\nconst copy = original.slice();\ncopy.push(4);\nconsole.log(`copy: ${JSON.stringify(copy)}`);\nconsole.log(`original: ${JSON.stringify(original)}`);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "slice", label: "slice() でコピーする" },
        { kind: "method", name: "push", label: "コピー側に push する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: "const original = [1, 2, 3];\nconst copy = original.slice();\ncopy.push(4);\nconsole.log(`copy: ${JSON.stringify(copy)}`);\nconsole.log(`original: ${JSON.stringify(original)}`);\n",
  badSolutions: [
    {
      code: `console.log("copy: [1,2,3,4]");
console.log("original: [1,2,3]");
`,
      description: "slice/push を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "Array.prototype.slice()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/slice", pageTitle: "Array.prototype.slice()" },
  ],
};
