import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch04PrefixSum: Assignment = {
  id: "S4-Ch04-01-prefix-sum",
  stage: "S4",
  chapterId: "Ch04",
  sequence: 1,
  title: "累積和テーブルを作る",
  newConcept: "1 つ前の累積に足し込んで、 累積和の配列を作る前処理パターン",
  estimatedMinutes: 25,
  difficulty: 1,
  testKind: "function",
  description: `## やること

数値配列 \`arr\` を受け取り、 **累積和テーブル** \`prefix\` を返す関数 \`prefixSum\` を実装してください。

- \`prefix[0] === 0\` (初期値)
- \`prefix[i] === arr[0] + arr[1] + ... + arr[i - 1]\`
- 戻り値の長さは \`arr.length + 1\`

\`\`\`js
prefixSum([1, 2, 3, 4]);   // → [0, 1, 3, 6, 10]
prefixSum([]);             // → [0]
prefixSum([5]);            // → [0, 5]
prefixSum([-1, -2, -3]);   // → [0, -1, -3, -6]
\`\`\`

## ポイント

- これは S4 アルゴリズム入門のひとつ。 **後の問題で何度も「区間の合計」が欲しくなる** ので、 1 度だけ前処理して使い回せる形にします。
- ループ変数 \`i\` で添字をたどり、 \`prefix[i + 1] = prefix[i] + arr[i]\` で 1 つ前の累積に足し込みます。
- S4 では \`reduce\` や \`map\` は **まだ使いません** (Ch09 で導入)。 古典的な \`for (let i = 0; ...)\` ループで書いてください。
`,
  starterFiles: singleFile(`function prefixSum(arr) {
  // prefix[0] = 0 から始め、 prefix[i + 1] = prefix[i] + arr[i] で埋める
}
`),
  entryPoints: ["prefixSum"],
  demoCall: `console.log(prefixSum([1, 2, 3, 4]));`,
  tests: [
    {
      name: "prefixSum([1,2,3,4]) は [0,1,3,6,10]",
      code: `JSON.stringify(prefixSum([1, 2, 3, 4])) === JSON.stringify([0, 1, 3, 6, 10])`,
    },
    {
      name: "空配列なら [0]",
      code: `JSON.stringify(prefixSum([])) === JSON.stringify([0])`,
    },
    {
      name: "要素 1 個 [5] なら [0, 5]",
      code: `JSON.stringify(prefixSum([5])) === JSON.stringify([0, 5])`,
    },
    {
      name: "負の数の累積和も正しい",
      code: `JSON.stringify(prefixSum([-1, -2, -3])) === JSON.stringify([0, -1, -3, -6])`,
    },
    {
      name: "戻り値の長さは arr.length + 1",
      code: `prefixSum([10, 10, 10]).length === 4`,
    },
    {
      name: "先頭は必ず 0",
      code: `prefixSum([100, 200, 300])[0] === 0`,
    },
  ],
  hints: [
    "1) const out = [0] で先頭 0 を入れる。 2) for (let i = 0; i < arr.length; i++) で out.push(out[i] + arr[i])。",
    "解答例:\n```js\nfunction prefixSum(arr) {\n  const out = [0];\n  for (let i = 0; i < arr.length; i++) {\n    out.push(out[i] + arr[i]);\n  }\n  return out;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で累積和の配列を返す" },
        { kind: "node", nodeType: "ForStatement", label: "for (let i = 0; ...) で添字を回す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "reduce", label: "S4 では reduce を使わない (Ch09 で導入)" },
        { kind: "method", name: "map", label: "S4 では map を使わない (Ch09 で導入)" },
      ],
    },
  },
  solution: `function prefixSum(arr) {
  const out = [0];
  for (let i = 0; i < arr.length; i++) {
    out.push(out[i] + arr[i]);
  }
  return out;
}
`,
  badSolutions: [
    {
      code: `function prefixSum(arr) {
  const out = [];
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
    out.push(sum);
  }
  return out;
}
`,
      description: "先頭の 0 を入れていない (長さが arr.length になりテスト失敗)",
    },
    {
      code: `function prefixSum(arr) {
  return arr.map((_, i) => arr.slice(0, i + 1).reduce((a, b) => a + b, 0));
}
`,
      description: "map と reduce を使っている (AST forbidden 違反)",
    },
    {
      code: `function prefixSum(arr) {
  return arr;
}
`,
      description: "そのまま返している (テスト失敗 + ForStatement 不足で AST 違反)",
    },
  ],
  mdnSections: [
    { heading: "配列の作成" },
    {
      heading: "Array.prototype.push",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/push",
      pageTitle: "Array.prototype.push",
    },
  ],
};
