import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch04SplitByThresholdCapstone: Assignment = {
  id: "S4-Ch04-05-split-by-threshold-capstone",
  stage: "S4",
  chapterId: "Ch04",
  sequence: 5,
  title: "[卒業課題] 閾値以上の値が連続する区間を全て抽出する",
  newConcept: "1 周のループ中で「現在の区間」 を状態として保持し、 区切れ目で結果配列に push する",
  estimatedMinutes: 45,
  difficulty: 3,
  testKind: "function",
  isCapstone: true,
  description: `## やること

数値配列 \`arr\` と閾値 \`threshold\` を受け取り、 **\`arr[i] >= threshold\` を満たす要素が連続する区間** をすべて抽出し、 \`{ start, end, sum }\` オブジェクトの配列にして返す関数 \`splitByThreshold\` を実装してください。

- \`start\`, \`end\` は **両端を含む** 区間の添字 (\`end\` は区間の最後の要素の添字)
- \`sum\` はその区間に含まれる要素の合計
- 単独要素 (長さ 1) も区間として認める
- 閾値未満しかない配列、 空配列、 すべて閾値未満の場合は \`[]\` を返す

\`\`\`js
splitByThreshold([1, 5, 6, 2, 8, 9, 1], 4);
// → [
//     { start: 1, end: 2, sum: 11 },   // [5, 6]
//     { start: 4, end: 5, sum: 17 },   // [8, 9]
//   ]

splitByThreshold([10, 1, 10], 5);
// → [
//     { start: 0, end: 0, sum: 10 },
//     { start: 2, end: 2, sum: 10 },
//   ]

splitByThreshold([5, 5, 5], 5);     // → [{ start: 0, end: 2, sum: 15 }]
splitByThreshold([], 5);            // → []
splitByThreshold([1, 2, 3], 10);    // → []
\`\`\`

## ポイント

- **これは S4 卒業課題のひとつ**。 「状態を保持して 1 周で区間を切り出す」 という S5 設計演習への橋渡しです。
- 状態として \`start\` (現在の区間の開始添字、 区間外なら \`-1\`) と \`sum\` (現在の区間の累積合計) を保持します。
- 配列を 1 周しながら:
  - \`arr[i] >= threshold\` のとき: 区間外 (\`start === -1\`) なら新規に始める。 区間内なら継続して \`sum\` に足す。
  - 閾値未満のとき: 区間内なら確定して \`push\` し、 状態をリセット。
- **ループ終了後に、 末尾でまだ区間内のままなら最後の push を忘れずに**。 これを忘れる badSolution は典型的な落とし穴です。
- AST で \`reduce\` / \`filter\` / \`map\` は禁止。 添字 for と if で状態遷移を手書きしてください。
`,
  starterFiles: singleFile(`function splitByThreshold(arr, threshold) {
  // 状態: start (区間外なら -1)、 sum (現在の区間の累積)
  // for で 1 周し、 閾値以上なら区間を始めるか継続、 閾値未満なら確定 push
  // ループ終了後、 まだ区間内なら最後の push を忘れない
}
`),
  entryPoints: ["splitByThreshold"],
  demoCall: `console.log(splitByThreshold([1, 5, 6, 2, 8, 9, 1], 4));`,
  tests: [
    {
      name: "2 つの区間を順に抽出",
      code: `JSON.stringify(splitByThreshold([1, 5, 6, 2, 8, 9, 1], 4)) === JSON.stringify([{ start: 1, end: 2, sum: 11 }, { start: 4, end: 5, sum: 17 }])`,
    },
    {
      name: "空配列は空",
      code: `JSON.stringify(splitByThreshold([], 5)) === JSON.stringify([])`,
    },
    {
      name: "全て閾値未満なら空",
      code: `JSON.stringify(splitByThreshold([1, 2, 3], 10)) === JSON.stringify([])`,
    },
    {
      name: "閾値ちょうど (>=) も区間に含む",
      code: `JSON.stringify(splitByThreshold([5, 5, 5], 5)) === JSON.stringify([{ start: 0, end: 2, sum: 15 }])`,
    },
    {
      name: "単独要素の区間が並ぶ",
      code: `JSON.stringify(splitByThreshold([10, 1, 10], 5)) === JSON.stringify([{ start: 0, end: 0, sum: 10 }, { start: 2, end: 2, sum: 10 }])`,
    },
    {
      name: "末尾までが区間 (末尾処理が必要なケース)",
      code: `JSON.stringify(splitByThreshold([1, 5, 5, 5], 4)) === JSON.stringify([{ start: 1, end: 3, sum: 15 }])`,
    },
    {
      name: "1 つおきに閾値以上 (区間数 3 件)",
      code: `splitByThreshold([1, 8, 1, 8, 8, 1, 8], 5).length === 3`,
    },
  ],
  hints: [
    "状態は let start = -1; let sum = 0; const out = []; の 3 つ。",
    "区間が切れたタイミング (閾値未満になった or 配列終端に到達) で out.push({ start, end: i - 1, sum }) してから start = -1 にリセット。",
    "解答例:\n```js\nfunction splitByThreshold(arr, threshold) {\n  const out = [];\n  let start = -1;\n  let sum = 0;\n  for (let i = 0; i < arr.length; i++) {\n    if (arr[i] >= threshold) {\n      if (start === -1) {\n        start = i;\n        sum = 0;\n      }\n      sum += arr[i];\n    } else if (start !== -1) {\n      out.push({ start, end: i - 1, sum });\n      start = -1;\n      sum = 0;\n    }\n  }\n  if (start !== -1) {\n    out.push({ start, end: arr.length - 1, sum });\n  }\n  return out;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で区間オブジェクトの配列を返す" },
        { kind: "node", nodeType: "ForStatement", label: "for (let i = 0; ...) で添字を回す" },
        { kind: "node", nodeType: "IfStatement", label: "if で状態遷移を書く" },
        { kind: "const-declaration", name: "out", label: "結果配列を const out = [] で用意する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "reduce", label: "S4 では reduce を使わない (Ch09 で導入)" },
        { kind: "method", name: "filter", label: "S4 では filter を使わない (Ch09 で導入)" },
        { kind: "method", name: "map", label: "S4 では map を使わない (Ch09 で導入)" },
      ],
    },
  },
  solution: `function splitByThreshold(arr, threshold) {
  const out = [];
  let start = -1;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] >= threshold) {
      if (start === -1) {
        start = i;
        sum = 0;
      }
      sum += arr[i];
    } else if (start !== -1) {
      out.push({ start, end: i - 1, sum });
      start = -1;
      sum = 0;
    }
  }
  if (start !== -1) {
    out.push({ start, end: arr.length - 1, sum });
  }
  return out;
}
`,
  badSolutions: [
    {
      code: `function splitByThreshold(arr, threshold) {
  const out = [];
  let start = -1;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] >= threshold) {
      if (start === -1) {
        start = i;
        sum = 0;
      }
      sum += arr[i];
    } else if (start !== -1) {
      out.push({ start, end: i - 1, sum });
      start = -1;
      sum = 0;
    }
  }
  return out;
}
`,
      description: "ループ終了後の末尾処理を忘れている (末尾区間が取れずテスト失敗)",
    },
    {
      code: `function splitByThreshold(arr, threshold) {
  return arr
    .map((v, i) => ({ v, i }))
    .filter((x) => x.v >= threshold)
    .map((x) => ({ start: x.i, end: x.i, sum: x.v }));
}
`,
      description: "filter と map で要素単位に出力していて連続区間にまとめていない (AST forbidden 違反 + テスト失敗)",
    },
    {
      code: `function splitByThreshold(arr, threshold) {
  const out = [];
  let start = -1;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > threshold) {
      if (start === -1) {
        start = i;
        sum = 0;
      }
      sum += arr[i];
    } else if (start !== -1) {
      out.push({ start, end: i - 1, sum });
      start = -1;
      sum = 0;
    }
  }
  if (start !== -1) {
    out.push({ start, end: arr.length - 1, sum });
  }
  return out;
}
`,
      description: "閾値の比較が > になっており、 ちょうど threshold の要素が区間に含まれない (テスト失敗)",
    },
    {
      code: `function splitByThreshold(arr, threshold) {
  const out = [];
  let start = -1;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] >= threshold) {
      if (start === -1) {
        start = i;
      }
      sum += arr[i];
    } else if (start !== -1) {
      out.push({ start, end: i - 1, sum });
      start = -1;
    }
  }
  if (start !== -1) {
    out.push({ start, end: arr.length - 1, sum });
  }
  return out;
}
`,
      description: "区間切り替え時に sum をリセットしておらず、 2 つ目以降の区間の sum に前区間の合計が混ざる (テスト失敗)",
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
