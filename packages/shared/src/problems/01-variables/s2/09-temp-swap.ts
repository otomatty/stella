import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch01TempSwap: Assignment = {
  id: "S2-Ch01-09-temp-swap",
  stage: "S2",
  chapterId: "Ch01",
  sequence: 9,
  title: "テンポラリ変数で値を入れ替える",
  newConcept: "一時保管用の変数を使って 2 つの値を交換する",
  estimatedMinutes: 8,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

\`let a = 1;\` と \`let b = 2;\` の値を **入れ替えて** から、 \`a=2 b=1\` の形で出力してください。

入れ替えるには「一時保管」 のための変数 \`temp\` が必要です。

\`\`\`
temp に a の値を退避 → a に b の値を入れる → b に temp の値を入れる
\`\`\`

## 期待する出力

\`\`\`
a=2 b=1
\`\`\`

## ポイント

- 直接 \`a = b; b = a;\` と書くと、 \`b = a\` の時点で a も b も同じ値になっており **元の a の値を失います**。
- だから一時変数 \`temp\` に元の値を取っておく必要があります。
- 出力にはテンプレートリテラル \`a=\${a} b=\${b}\` を使います。
`,
  starterFiles: singleFile(`// 入れ替え対象の 2 つの値を、 それぞれ let の変数に入れる


// 一時保管用の const の変数に 1 つ目の値を退避する


// 1 つ目の変数に 2 つ目の値を入れ直し、 2 つ目の変数に退避した値を入れ直す


// テンプレートリテラルで「a=... b=...」 形式の文字列を組み立てて console.log で出力する

`),
  tests: [
    {
      name: "stdout が a=2 b=1 になる",
      expectedStdout: "a=2 b=1",
    },
  ],
  hints: [
    "順番が重要です。 まず `const temp = a;` で a の値を退避します。",
    "次に `a = b;` で a を b の値で上書き、 最後に `b = temp;` で b を元の a の値で上書きします。",
    "解答例:\n```js\nlet a = 1;\nlet b = 2;\nconst temp = a;\na = b;\nb = temp;\nconsole.log(`a=${a} b=${b}`);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "const-declaration",
          name: "temp",
          label: "退避用の const temp を宣言する",
        },
        {
          kind: "node",
          nodeType: "TemplateLiteral",
          label: "テンプレートリテラルで出力する",
        },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        {
          kind: "console-log",
          argument: { kind: "string", value: "a=2 b=1" },
          label: "結果を文字列リテラルで直接出力しない",
        },
      ],
    },
  },
  solution: "let a = 1;\nlet b = 2;\nconst temp = a;\na = b;\nb = temp;\nconsole.log(`a=${a} b=${b}`);\n",
  badSolutions: [
    {
      code: "console.log(`a=2 b=1`);\n",
      description: "入れ替えロジックを書かず結果を直接出力している",
    },
  ],
  mdnSections: [
    { heading: "let", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/let", pageTitle: "let" },
  ],
};
