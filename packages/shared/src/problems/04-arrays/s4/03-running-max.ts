import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch04RunningMax: Assignment = {
  id: "S4-Ch04-03-running-max",
  stage: "S4",
  chapterId: "Ch04",
  sequence: 3,
  title: "各位置までの累積最大値を返す",
  newConcept: "走査中の「ここまでの最大」 を状態として持ち、 結果配列に都度書き込む",
  estimatedMinutes: 25,
  difficulty: 1,
  testKind: "function",
  description: `## やること

数値配列 \`arr\` を受け取り、 各位置までの **累積最大値** を並べた配列 \`out\` を返す関数 \`runningMax\` を実装してください。

- \`out[i] === Math.max(arr[0], arr[1], ..., arr[i])\`
- 戻り値の長さは \`arr.length\` (空配列なら \`[]\`)

\`\`\`js
runningMax([3, 1, 4, 1, 5, 9, 2, 6]);   // → [3, 3, 4, 4, 5, 9, 9, 9]
runningMax([5]);                         // → [5]
runningMax([]);                          // → []
runningMax([-1, -2, -3]);                // → [-1, -1, -1]
runningMax([1, 2, 3, 4]);                // → [1, 2, 3, 4]
\`\`\`

## ポイント

- 「現在の最大候補」 を \`let m\` で保持し、 配列を 1 周しながら **\`if (arr[i] > m) m = arr[i];\`** で更新します。
- 更新したあとに \`out.push(m)\` で各位置の累積最大を記録します。
- AST で **添字 \`for\`** と **\`if 文\`** を必須にしているので、 \`for...of\` や \`m = Math.max(m, arr[i])\` の 1 行更新では通りません。 自分の手で **添字 for + 条件分岐** を書いてください。
`,
  starterFiles: singleFile(`function runningMax(arr) {
  // 結果を入れる空の配列と、 これまでの最大値を入れる変数を用意する


  // for で添字を順に回し、 先頭または直前までの最大より大きければ最大値を更新し、
  // 毎回その時点の最大を結果配列に push する


  // 結果配列を return する
}
`),
  entryPoints: ["runningMax"],
  demoCall: `console.log(runningMax([3, 1, 4, 1, 5, 9, 2, 6]));`,
  tests: [
    {
      name: "runningMax([3,1,4,1,5,9,2,6])",
      code: `JSON.stringify(runningMax([3, 1, 4, 1, 5, 9, 2, 6])) === JSON.stringify([3, 3, 4, 4, 5, 9, 9, 9])`,
    },
    {
      name: "空配列は空",
      code: `JSON.stringify(runningMax([])) === JSON.stringify([])`,
    },
    {
      name: "要素 1 個ならそのまま",
      code: `JSON.stringify(runningMax([5])) === JSON.stringify([5])`,
    },
    {
      name: "全て負の数でも初期値に影響されない",
      code: `JSON.stringify(runningMax([-1, -2, -3])) === JSON.stringify([-1, -1, -1])`,
    },
    {
      name: "単調増加",
      code: `JSON.stringify(runningMax([1, 2, 3, 4])) === JSON.stringify([1, 2, 3, 4])`,
    },
    {
      name: "戻り値の長さは arr.length と一致",
      code: `runningMax([7, 7, 7, 7]).length === 4`,
    },
  ],
  hints: [
    "let m = 0 と const out = [] を用意 (初回は if 内で m = arr[i] と代入する)。",
    "for (let i = 0; i < arr.length; i++) で添字を回し、 if (i === 0 || arr[i] > m) m = arr[i]; の後に out.push(m)。",
    "解答例:\n```js\nfunction runningMax(arr) {\n  const out = [];\n  let m = 0;\n  for (let i = 0; i < arr.length; i++) {\n    if (i === 0 || arr[i] > m) {\n      m = arr[i];\n    }\n    out.push(m);\n  }\n  return out;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で累積最大値の配列を返す" },
        { kind: "node", nodeType: "ForStatement", label: "for (let i = 0; ...) で添字を回す" },
        { kind: "node", nodeType: "IfStatement", label: "if で最大値を更新する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "reduce", label: "S4 では reduce を使わない (Ch09 で導入)" },
        { kind: "method", name: "map", label: "S4 では map を使わない (Ch09 で導入)" },
        { kind: "method", name: "slice", label: "slice + Math.max のショートカットを避ける" },
      ],
    },
  },
  solution: `function runningMax(arr) {
  const out = [];
  let m = 0;
  for (let i = 0; i < arr.length; i++) {
    if (i === 0 || arr[i] > m) {
      m = arr[i];
    }
    out.push(m);
  }
  return out;
}
`,
  badSolutions: [
    {
      code: `function runningMax(arr) {
  return arr.map((_, i) => Math.max(...arr.slice(0, i + 1)));
}
`,
      description: "map と slice を使った安易解 (AST forbidden 違反)",
    },
    {
      code: `function runningMax(arr) {
  const out = [];
  let m = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    m = Math.max(m, arr[i]);
    out.push(m);
  }
  return out;
}
`,
      description: "Math.max で更新しており IfStatement が無い (AST required 違反)",
    },
    {
      code: `function runningMax(arr) {
  const out = [];
  let m = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > m) {
      m = arr[i];
    }
    out.push(m);
  }
  return out;
}
`,
      description: "初期値を 0 にしているため全要素が負のとき誤った最大 (0) を返す (テスト失敗)",
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
