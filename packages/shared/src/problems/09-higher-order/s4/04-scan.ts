import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch09Scan: Assignment = {
  id: "S4-Ch09-04-scan",
  stage: "S4",
  chapterId: "Ch09",
  sequence: 4,
  title: "reduce で `scan` (累積過程を残す reduce) を自作する",
  newConcept: "`reduce` が「最後の累積値」 だけを返すのに対し、 各ステップの累積値を **配列で全て残す**",
  estimatedMinutes: 30,
  difficulty: 2,
  testKind: "function",
  description: `## やること

配列 \`arr\`、 二項関数 \`fn\` (\`(acc, x) => 次の acc\`)、 初期値 \`init\` を受け取り、 各ステップの **累積値** を順に並べた配列を返す関数 \`scan\` を **\`reduce\` を使って** 実装してください。

戻り値の **先頭は \`init\` そのもの**、 続いて 1 件目を処理した結果、 2 件目を処理した結果 … と **入力配列の長さ + 1** 件並びます。

\`\`\`js
scan([1, 2, 3, 4], (a, b) => a + b, 0);    // → [0, 1, 3, 6, 10]   (累積和)
scan([3, 1, 4, 1, 5], (a, b) => Math.max(a, b), -Infinity);
// → [-Infinity, 3, 3, 4, 4, 5]   (累積最大)

scan([], (a, b) => a + b, 0);              // → [0]   (init 1 件だけ)
\`\`\`

## ポイント

- **戻り値の先頭は必ず \`init\`** です (入力が空でも \`[init]\` を返す)。
- \`reduce\` の初期値を \`[init]\` で始め、 各ステップで「最後の累積値に \`fn\` を適用した次の値」 を末尾に push する形が素直です:
  \`\`\`js
  arr.reduce((acc, x) => {
    acc.push(fn(acc[acc.length - 1], x));
    return acc;
  }, [init]);
  \`\`\`
- AST で **\`reduce\` 必須**、 **\`forEach\` 禁止** なので、 副作用ループでは通りません。
- 入力配列 \`arr\` を **書き換えない** こと (非破壊)。
`,
  starterFiles: singleFile(`function scan(arr, fn, init) {
  // reduce の初期値 [init] に対して、 各ステップの累積値を push してください
}
`),
  entryPoints: ["scan"],
  demoCall: `console.log(scan([1, 2, 3, 4], (a, b) => a + b, 0));`,
  tests: [
    {
      name: "累積和 (init=0)",
      code: `JSON.stringify(scan([1, 2, 3, 4], (a, b) => a + b, 0)) === JSON.stringify([0, 1, 3, 6, 10])`,
    },
    {
      name: "累積最大 (init=-Infinity)",
      code: `JSON.stringify(scan([3, 1, 4, 1, 5], (a, b) => a > b ? a : b, -Infinity)) === JSON.stringify([-Infinity, 3, 3, 4, 4, 5])`,
    },
    {
      name: "空配列なら [init] だけ",
      code: `JSON.stringify(scan([], (a, b) => a + b, 0)) === JSON.stringify([0])`,
    },
    {
      name: "戻り値の長さは入力配列の長さ + 1",
      code: `scan([10, 20, 30], (a, b) => a + b, 0).length === 4`,
    },
    {
      name: "init が文字列でも動く (累積連結)",
      code: `JSON.stringify(scan(["a", "b", "c"], (acc, c) => acc + c, "")) === JSON.stringify(["", "a", "ab", "abc"])`,
    },
    {
      name: "元の配列を変更しない (非破壊)",
      code: `(() => {
        const src = [1, 2, 3];
        scan(src, (a, b) => a + b, 0);
        return JSON.stringify(src) === JSON.stringify([1, 2, 3]);
      })()`,
    },
  ],
  hints: [
    "arr.reduce((acc, x) => { acc.push(fn(acc[acc.length - 1], x)); return acc; }, [init])",
    "解答例:\n```js\nfunction scan(arr, fn, init) {\n  return arr.reduce((acc, x) => {\n    const next = fn(acc[acc.length - 1], x);\n    acc.push(next);\n    return acc;\n  }, [init]);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で累積過程の配列を返す" },
        { kind: "method", name: "reduce", label: "Array.reduce を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "forEach", label: "forEach ではなく reduce で組み立てる" },
        { kind: "node", nodeType: "ForStatement", label: "reduce 課題なので for は使わない" },
        { kind: "node", nodeType: "ForOfStatement", label: "reduce 課題なので for...of は使わない" },
        { kind: "node", nodeType: "ForInStatement", label: "reduce 課題なので for...in は使わない" },
        { kind: "node", nodeType: "WhileStatement", label: "reduce 課題なので while は使わない" },
        { kind: "node", nodeType: "DoWhileStatement", label: "reduce 課題なので do...while は使わない" },
      ],
    },
  },
  solution: `function scan(arr, fn, init) {
  return arr.reduce((acc, x) => {
    const next = fn(acc[acc.length - 1], x);
    acc.push(next);
    return acc;
  }, [init]);
}
`,
  badSolutions: [
    {
      code: `function scan(arr, fn, init) {
  return arr.reduce((acc, x) => {
    acc.push(fn(acc[acc.length - 1] ?? init, x));
    return acc;
  }, []);
}
`,
      description: "戻り値の先頭に init を含めていないので長さが 1 短い (テスト失敗)",
    },
    {
      code: `function scan(arr, fn, init) {
  const result = [init];
  let acc = init;
  arr.forEach((x) => {
    acc = fn(acc, x);
    result.push(acc);
  });
  return result;
}
`,
      description: "forEach で書いていて reduce を使っていない (AST 必須未充足、 forEach 禁止違反)",
    },
    {
      code: `function scan(arr, fn, init) {
  return arr.reduce((acc, x) => {
    acc.push(fn(init, x));
    return acc;
  }, [init]);
}
`,
      description: "毎回 init から計算しているので累積になっていない (テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.reduce",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce",
      pageTitle: "Array.prototype.reduce",
    },
  ],
};
