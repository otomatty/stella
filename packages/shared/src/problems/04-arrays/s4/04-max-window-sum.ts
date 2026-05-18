import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch04MaxWindowSum: Assignment = {
  id: "S4-Ch04-04-max-window-sum",
  stage: "S4",
  chapterId: "Ch04",
  sequence: 4,
  title: "連続する k 個の合計のうち最大値を返す (スライディングウィンドウ)",
  newConcept: "ウィンドウをずらすときに「外れる要素を引き、 新しい要素を足す」 だけで合計を再計算しない",
  estimatedMinutes: 35,
  difficulty: 2,
  testKind: "function",
  description: `## やること

数値配列 \`arr\` と正の整数 \`k\` (\`1 <= k <= arr.length\`) を受け取り、 **長さ \`k\` の連続部分配列の合計のうち最大値** を返す関数 \`maxWindowSum\` を実装してください。

\`\`\`js
maxWindowSum([1, 2, 3, 4, 5], 2);          // → 9   (4 + 5)
maxWindowSum([1, 2, 3, 4, 5], 3);          // → 12  (3 + 4 + 5)
maxWindowSum([2, 1, 5, 1, 3, 2], 3);       // → 9   (5 + 1 + 3 が最大)
maxWindowSum([4], 1);                       // → 4
maxWindowSum([5, 5, 5, 5], 2);             // → 10
maxWindowSum([-1, -2, -3, -4], 2);         // → -3  (-1 + -2)
\`\`\`

## ポイント

- ナイーブに「i ごとに k 個を足し直す」 と \`O(n × k)\` ですが、 **スライディングウィンドウ** なら \`O(n)\` です。
- 手順:
  1. 最初の \`k\` 個の合計を \`sum\` に入れ、 これを \`best\` の初期値にする。
  2. \`i = k\` から \`arr.length - 1\` まで進め、 **新たに入る要素 \`arr[i]\` を足し、 抜ける要素 \`arr[i - k]\` を引く**。
  3. その都度 \`sum > best\` なら \`best\` を更新。
- \`slice\` と \`reduce\` は **禁止** しています (ナイーブ解を防ぐため)。
- \`best\` の初期値を \`0\` にしてしまうと、 全要素が負のときに 0 を返してしまいます。 必ず **最初のウィンドウの合計** で初期化してください。
`,
  starterFiles: singleFile(`function maxWindowSum(arr, k) {
  // 最初の k 個の合計を計算し、 現在のウィンドウ合計と最大合計をそれぞれの変数に入れる


  // 添字 k から末尾まで for で回し、 ウィンドウを 1 つずらすたびに
  // 「新しく入る要素 - 抜ける要素」 で合計を更新し、 必要なら最大も更新する


  // 最大合計を return する
}
`),
  entryPoints: ["maxWindowSum"],
  demoCall: `console.log(maxWindowSum([1, 2, 3, 4, 5], 3));`,
  tests: [
    {
      name: "maxWindowSum([1,2,3,4,5], 2) は 9",
      code: `maxWindowSum([1, 2, 3, 4, 5], 2) === 9`,
    },
    {
      name: "maxWindowSum([1,2,3,4,5], 3) は 12",
      code: `maxWindowSum([1, 2, 3, 4, 5], 3) === 12`,
    },
    {
      name: "中央寄りで最大になるケース",
      code: `maxWindowSum([2, 1, 5, 1, 3, 2], 3) === 9`,
    },
    {
      name: "要素 1 個 + k = 1",
      code: `maxWindowSum([4], 1) === 4`,
    },
    {
      name: "同じ値が並ぶケース",
      code: `maxWindowSum([5, 5, 5, 5], 2) === 10`,
    },
    {
      name: "全て負の数 (初期値 0 では誤答になる)",
      code: `maxWindowSum([-1, -2, -3, -4], 2) === -3`,
    },
    {
      name: "k === arr.length なら全体の合計",
      code: `maxWindowSum([1, 2, 3], 3) === 6`,
    },
  ],
  hints: [
    "最初の k 個の合計を別の for で作っておく。",
    "次の for で i = k から始め、 sum += arr[i] - arr[i - k] (新しい要素を足し、 抜ける要素を引く)。 if (sum > best) best = sum。",
    "解答例:\n```js\nfunction maxWindowSum(arr, k) {\n  let sum = 0;\n  for (let i = 0; i < k; i++) {\n    sum += arr[i];\n  }\n  let best = sum;\n  for (let i = k; i < arr.length; i++) {\n    sum += arr[i] - arr[i - k];\n    if (sum > best) {\n      best = sum;\n    }\n  }\n  return best;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で最大合計を返す" },
        { kind: "node", nodeType: "ForStatement", label: "for (let i = 0; ...) で添字を回す" },
        { kind: "node", nodeType: "IfStatement", label: "if で best を更新する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "reduce", label: "S4 では reduce を使わない (Ch09 で導入)" },
        { kind: "method", name: "map", label: "S4 では map を使わない (Ch09 で導入)" },
        { kind: "method", name: "slice", label: "ウィンドウを毎回 slice する O(n*k) 解を避ける" },
      ],
    },
  },
  solution: `function maxWindowSum(arr, k) {
  let sum = 0;
  for (let i = 0; i < k; i++) {
    sum += arr[i];
  }
  let best = sum;
  for (let i = k; i < arr.length; i++) {
    sum += arr[i] - arr[i - k];
    if (sum > best) {
      best = sum;
    }
  }
  return best;
}
`,
  badSolutions: [
    {
      code: `function maxWindowSum(arr, k) {
  let best = -Infinity;
  for (let i = 0; i <= arr.length - k; i++) {
    const s = arr.slice(i, i + k).reduce((a, b) => a + b, 0);
    if (s > best) best = s;
  }
  return best;
}
`,
      description: "slice + reduce を毎反復で呼ぶ O(n*k) 解 (AST forbidden 違反)",
    },
    {
      code: `function maxWindowSum(arr, k) {
  let sum = 0;
  for (let i = 0; i < k; i++) {
    sum += arr[i];
  }
  let best = 0;
  if (sum > best) {
    best = sum;
  }
  for (let i = k; i < arr.length; i++) {
    sum += arr[i] - arr[i - k];
    if (sum > best) {
      best = sum;
    }
  }
  return best;
}
`,
      description: "best の初期値を 0 にしているため全要素が負のときに 0 を返す (テスト失敗)",
    },
    {
      code: `function maxWindowSum(arr, k) {
  let sum = 0;
  for (let i = 0; i < k; i++) {
    sum += arr[i];
  }
  let best = sum;
  for (let i = k; i < arr.length; i++) {
    sum += arr[i] - arr[i - k + 1];
    if (sum > best) {
      best = sum;
    }
  }
  return best;
}
`,
      description: "ウィンドウから抜ける添字が arr[i - k + 1] になっている off-by-one (テスト失敗)",
    },
  ],
  mdnSections: [
    { heading: "配列の作成" },
    {
      heading: "Array.prototype.length",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/length",
      pageTitle: "Array.prototype.length",
    },
  ],
};
