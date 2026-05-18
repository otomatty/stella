import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch04SumCapstone: Assignment = {
  id: "S2-Ch04-13-sum-capstone",
  stage: "S2",
  chapterId: "Ch04",
  sequence: 13,
  title: "[チャレンジ] for ループで配列の合計を求める",
  newConcept: "S2 で習った配列と for ループ (Ch06) を組み合わせる",
  estimatedMinutes: 12,
  difficulty: 2,
  testKind: "stdout",
  isCapstone: true,
  description: `## やること

配列 \`[10, 25, 33, 47, 5]\` の合計値を **for ループ** を使って計算し、 \`合計: 120\` の形で出力する **チャレンジ問題** です。

ループは Ch06 で詳しく扱いますが、 ここでは「全要素を 1 つずつ取り出して足す」 という基本形を試します。

\`\`\`js
let total = 0;
for (let i = 0; i < nums.length; i++) {
  total += nums[i];
}
\`\`\`

## 期待する出力

\`\`\`
合計: 120
\`\`\`

## ポイント

- \`let total = 0;\` で 0 から開始し、 ループの中で \`total += nums[i]\` を繰り返します。
- ループ条件は \`i < nums.length\` (添字が長さ未満の間)。
- 最後にテンプレートリテラルで \`合計: \${total}\` を出力します。
`,
  starterFiles: singleFile(`// 数値の配列を const の変数に入れる


// 合計を入れる let の変数を 0 で初期化する


// for ループで配列の全要素を += で足し込む


// テンプレートリテラルで「合計: ...」 形式の文字列を組み立て、 console.log で出力する

`),
  tests: [
    {
      name: "stdout が 合計: 120 になる",
      expectedStdout: "合計: 120",
    },
  ],
  hints: [
    "`let total = 0;` で合計用変数を初期化します。",
    "`for (let i = 0; i < nums.length; i++) { total += nums[i]; }` で全要素を足し込みます。",
    "解答例:\n```js\nconst nums = [10, 25, 33, 47, 5];\nlet total = 0;\nfor (let i = 0; i < nums.length; i++) {\n  total += nums[i];\n}\nconsole.log(`合計: ${total}`);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "const-declaration", name: "nums", label: "const nums を宣言する" },
        { kind: "node", nodeType: "ForStatement", label: "for ループを使う" },
        { kind: "node", nodeType: "TemplateLiteral", label: "テンプレートリテラルで出力する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: "const nums = [10, 25, 33, 47, 5];\nlet total = 0;\nfor (let i = 0; i < nums.length; i++) {\n  total += nums[i];\n}\nconsole.log(`合計: ${total}`);\n",
  badSolutions: [
    {
      code: "console.log(`合計: 120`);\n",
      description: "計算ロジックを書かず結果を直接出力している",
    },
    {
      code: "const nums = [10, 25, 33, 47, 5];\nconst total = nums[0] + nums[1] + nums[2] + nums[3] + nums[4];\nconsole.log(`合計: ${total}`);\n",
      description: "for ループを使わず添字を並べて足している",
    },
  ],
  mdnSections: [
    { heading: "for 文", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for", pageTitle: "for 文" },
    { heading: "Array.prototype.length", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/length", pageTitle: "Array.prototype.length" },
  ],
};
