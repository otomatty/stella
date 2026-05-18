import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch01BlockScopeLet: Assignment = {
  id: "S2-Ch01-01-block-scope-let",
  stage: "S2",
  chapterId: "Ch01",
  sequence: 1,
  title: "const のブロックスコープを確認する",
  newConcept: "{ } の中で宣言した const 変数はその外には漏れない (let も同様)",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`{ }\` のブロックの中で **同じ名前** の変数を別々に作っても、 中の変数と外の変数は **別物** です。 次の手順で確かめてください。

1. 外側に \`const message = "外側";\` を宣言する
2. \`{\` で始まるブロックを書き、 その中で \`const message = "内側";\` を宣言し、 \`console.log(message);\` で出力する
3. ブロックを \`}\` で閉じたあと、 もう一度 \`console.log(message);\` を書く

## 期待する出力

\`\`\`
内側
外側
\`\`\`

## ポイント

- \`{ }\` で囲まれた範囲を **ブロック** と呼びます。 \`const\` / \`let\` で作った変数は **そのブロックの中だけ** で有効です。
- 中で同じ名前を使っても外には影響しません。 これを「ブロックスコープ」 と呼びます。
`,
  starterFiles: singleFile(`// ブロックの外側で const の変数に文字列を入れる


// { } のブロックを開き、 その中でも同じ名前の const の変数に別の文字列を入れて
// console.log で出力する


// ブロックを閉じたあと、 もう一度 console.log で同じ変数を出力する

`),
  tests: [
    {
      name: "stdout が 内側→外側 の 2 行になる",
      expectedStdout: "内側\n外側",
    },
  ],
  hints: [
    "ブロックは `{` と `}` だけでも作れます。 if の中である必要はありません。",
    "内側の `const message` は外側の `const message` をシャドーイング (覆い隠す) します。 ブロックの外では外側の `message` が見えます。",
    "解答例:\n```js\nconst message = \"外側\";\n{\n  const message = \"内側\";\n  console.log(message);\n}\nconsole.log(message);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "const-declaration",
          name: "message",
          label: "const message を宣言する",
        },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        {
          kind: "console-log",
          argument: { kind: "string", value: "外側" },
          label: "結果を文字列リテラルで直接出力しない",
        },
        {
          kind: "console-log",
          argument: { kind: "string", value: "内側" },
          label: "結果を文字列リテラルで直接出力しない",
        },
      ],
    },
  },
  solution: `const message = "外側";
{
  const message = "内側";
  console.log(message);
}
console.log(message);
`,
  badSolutions: [
    {
      code: `console.log("内側");
console.log("外側");
`,
      description: "変数を作らずに直接文字列を出力している",
    },
  ],
  mdnSections: [
    { heading: "ブロック文", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/block", pageTitle: "ブロック文" },
  ],
};
