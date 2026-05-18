import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch04RangeSum: Assignment = {
  id: "S4-Ch04-02-range-sum",
  stage: "S4",
  chapterId: "Ch04",
  sequence: 2,
  title: "累積和で区間 [l, r) の合計を求める",
  newConcept: "前処理 (累積和) を 1 度作り、 任意の区間合計を O(1) で取り出す",
  estimatedMinutes: 30,
  difficulty: 2,
  testKind: "function",
  description: `## やること

数値配列 \`arr\` と 2 つの非負整数 \`l\`, \`r\` を受け取り、 **半開区間 \`[l, r)\` の合計** (\`arr[l] + arr[l+1] + ... + arr[r-1]\`) を返す関数 \`rangeSum\` を実装してください。

- \`0 <= l <= r <= arr.length\` 前提
- \`l === r\` のときは空区間で合計は \`0\`
- \`l === 0\`, \`r === arr.length\` なら全体の合計

\`\`\`js
rangeSum([1, 2, 3, 4, 5], 1, 4);   // → 9   (2 + 3 + 4)
rangeSum([1, 2, 3, 4, 5], 0, 5);   // → 15
rangeSum([1, 2, 3], 2, 2);         // → 0   (空区間)
rangeSum([], 0, 0);                // → 0
rangeSum([-1, -2, -3, -4], 1, 3);  // → -5
\`\`\`

## ポイント

- 1 つだけクエリを返すなら毎回ループしてもよいですが、 ここでは **累積和テーブルを 1 度作って引き算で求める** ことを練習します。
- \`prefix[0] = 0\`, \`prefix[i + 1] = prefix[i] + arr[i]\` を作っておけば、 区間 \`[l, r)\` の合計は **\`prefix[r] - prefix[l]\`** で求まります。
- \`slice\` で部分配列を切り出す書き方は **禁止** しています (\`O(r - l)\` のコピーが走るため累積和の意義が薄れる)。
`,
  starterFiles: singleFile(`function rangeSum(arr, l, r) {
  // 先頭が 0 で、 各位置までの累積和を順に持つ配列を作る (長さは入力配列より 1 大きい)


  // 累積和の右端と左端の差を return する
}
`),
  entryPoints: ["rangeSum"],
  demoCall: `console.log(rangeSum([1, 2, 3, 4, 5], 1, 4));`,
  tests: [
    {
      name: "rangeSum([1,2,3,4,5], 1, 4) は 9",
      code: `rangeSum([1, 2, 3, 4, 5], 1, 4) === 9`,
    },
    {
      name: "全体の合計が取れる",
      code: `rangeSum([1, 2, 3, 4, 5], 0, 5) === 15`,
    },
    {
      name: "l === r は 0 (空区間)",
      code: `rangeSum([1, 2, 3], 2, 2) === 0`,
    },
    {
      name: "空配列 + 0..0 は 0",
      code: `rangeSum([], 0, 0) === 0`,
    },
    {
      name: "先頭から 2 件",
      code: `rangeSum([10, 20, 30, 40], 0, 2) === 30`,
    },
    {
      name: "負の数の区間合計",
      code: `rangeSum([-1, -2, -3, -4], 1, 3) === -5`,
    },
    {
      name: "末尾までの区間",
      code: `rangeSum([1, 2, 3, 4, 5], 3, 5) === 9`,
    },
  ],
  hints: [
    "まず累積和 prefix を for ループで作る (prefix[0] = 0、 prefix[i+1] = prefix[i] + arr[i])。",
    "区間 [l, r) の合計は prefix[r] - prefix[l]。",
    "解答例:\n```js\nfunction rangeSum(arr, l, r) {\n  const prefix = [0];\n  for (let i = 0; i < arr.length; i++) {\n    prefix.push(prefix[i] + arr[i]);\n  }\n  return prefix[r] - prefix[l];\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で合計を返す" },
        { kind: "node", nodeType: "ForStatement", label: "for (let i = 0; ...) で累積和を組み立てる" },
        { kind: "const-declaration", name: "prefix", label: "const prefix = [0] で累積和テーブルを作る" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "reduce", label: "S4 では reduce を使わない (Ch09 で導入)" },
        { kind: "method", name: "map", label: "S4 では map を使わない (Ch09 で導入)" },
        { kind: "method", name: "filter", label: "S4 では filter を使わない (Ch09 で導入)" },
        { kind: "method", name: "slice", label: "slice + 合計の安易解を避ける (累積和で解く)" },
      ],
    },
  },
  solution: `function rangeSum(arr, l, r) {
  const prefix = [0];
  for (let i = 0; i < arr.length; i++) {
    prefix.push(prefix[i] + arr[i]);
  }
  return prefix[r] - prefix[l];
}
`,
  badSolutions: [
    {
      code: `function rangeSum(arr, l, r) {
  return arr.slice(l, r).reduce((a, b) => a + b, 0);
}
`,
      description: "slice と reduce を使った安易解 (AST forbidden 2 件)",
    },
    {
      code: `function rangeSum(arr, l, r) {
  let sum = 0;
  for (let i = l; i < r; i++) {
    sum += arr[i];
  }
  return sum;
}
`,
      description: "累積和テーブル prefix を作らずに毎回 i = l..r-1 で直接合計している (AST required 違反: const prefix が無い)",
    },
    {
      code: `function rangeSum(arr, l, r) {
  const prefix = [0];
  for (let i = 0; i < arr.length; i++) {
    prefix.push(prefix[i] + arr[i]);
  }
  return prefix[l] - prefix[r];
}
`,
      description: "引き算の順序が逆 (符号が反対になりテスト失敗)",
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
