import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch04StatsCapstone: Assignment = {
  id: "S3-Ch04-09-stats-capstone",
  stage: "S3",
  chapterId: "Ch04",
  sequence: 9,
  title: "[卒業課題] 配列の統計値オブジェクトを返す",
  newConcept: "複数の集計値を 1 つのオブジェクトにまとめて返す",
  estimatedMinutes: 25,
  difficulty: 3,
  testKind: "function",
  isCapstone: true,
  description: `## やること

非空の数値配列 \`arr\` を受け取り、 以下のプロパティを持つオブジェクトを返す関数 \`stats\` を実装してください。

- \`count\`: 要素数
- \`sum\`: 合計
- \`min\`: 最小値
- \`max\`: 最大値
- \`avg\`: 平均 (sum / count)

\`\`\`js
stats([1, 2, 3, 4, 5]);
// → { count: 5, sum: 15, min: 1, max: 5, avg: 3 }

stats([10]);
// → { count: 1, sum: 10, min: 10, max: 10, avg: 10 }

stats([-3, -1, -2]);
// → { count: 3, sum: -6, min: -3, max: -1, avg: -2 }
\`\`\`

## ポイント

- これは **S3 卒業課題** のひとつ。 1 回のループで複数の集計を同時にこなせるかを試します。
- \`min\` / \`max\` の初期値は \`arr[0]\` から始めるのが安全 (Infinity を使う手もある)。
- \`avg\` は最後に \`sum / count\` で出します。
`,
  starterFiles: singleFile(`function stats(arr) {
  // ここを実装してください
}
`),
  entryPoints: ["stats"],
  demoCall: `console.log(stats([1, 2, 3, 4, 5]));`,
  tests: [
    {
      name: "stats([1,2,3,4,5])",
      code: `(() => { const r = stats([1,2,3,4,5]); return r.count === 5 && r.sum === 15 && r.min === 1 && r.max === 5 && r.avg === 3; })()`,
    },
    {
      name: "stats([10])",
      code: `(() => { const r = stats([10]); return r.count === 1 && r.sum === 10 && r.min === 10 && r.max === 10 && r.avg === 10; })()`,
    },
    {
      name: "stats([-3,-1,-2])",
      code: `(() => { const r = stats([-3,-1,-2]); return r.count === 3 && r.sum === -6 && r.min === -3 && r.max === -1 && r.avg === -2; })()`,
    },
    {
      name: "stats([4,4,4,4])",
      code: `(() => { const r = stats([4,4,4,4]); return r.count === 4 && r.sum === 16 && r.min === 4 && r.max === 4 && r.avg === 4; })()`,
    },
    {
      name: "stats([100,200,300]) の avg は 200",
      code: `(() => { const r = stats([100,200,300]); return r.avg === 200 && r.min === 100 && r.max === 300; })()`,
    },
    {
      name: "stats([1,2]) の avg は 1.5 (小数も正しく返る)",
      code: `(() => { const r = stats([1,2]); return r.count === 2 && r.sum === 3 && r.min === 1 && r.max === 2 && r.avg === 1.5; })()`,
    },
  ],
  hints: [
    "min と max は arr[0] で初期化、 sum は 0 で初期化。",
    "for ループで sum, min, max を同時に更新。 ループ終了後に avg を計算してオブジェクトを return。",
    "解答例:\n```js\nfunction stats(arr) {\n  let sum = 0;\n  let min = arr[0];\n  let max = arr[0];\n  for (const n of arr) {\n    sum += n;\n    if (n < min) min = n;\n    if (n > max) max = n;\n  }\n  return { count: arr.length, sum, min, max, avg: sum / arr.length };\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return でオブジェクトを返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function stats(arr) {
  let sum = 0;
  let min = arr[0];
  let max = arr[0];
  for (const n of arr) {
    sum += n;
    if (n < min) {
      min = n;
    }
    if (n > max) {
      max = n;
    }
  }
  return {
    count: arr.length,
    sum,
    min,
    max,
    avg: sum / arr.length,
  };
}
`,
  badSolutions: [
    {
      code: `function stats(arr) {
  return { count: arr.length, sum: 0, min: 0, max: 0, avg: 0 };
}
`,
      description: "値を集計せず固定で 0 を返している",
    },
    {
      code: `function stats(arr) {
  let sum = 0;
  for (const n of arr) sum += n;
  return { count: arr.length, sum, min: arr[0], max: arr[0], avg: sum / arr.length };
}
`,
      description: "min / max を arr[0] のままにしていて更新していない",
    },
  ],
  mdnSections: [
    {
      heading: "オブジェクト初期化子",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Object_initializer",
      pageTitle: "オブジェクト初期化子",
    },
  ],
};
