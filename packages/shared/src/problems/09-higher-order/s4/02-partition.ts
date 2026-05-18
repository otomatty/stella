import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch09Partition: Assignment = {
  id: "S4-Ch09-02-partition",
  stage: "S4",
  chapterId: "Ch09",
  sequence: 2,
  title: "reduce で `partition` を自作する",
  newConcept: "述語関数を受け取り、 配列を「条件に合うもの」 と「合わないもの」 の 2 つに 1 周で分ける",
  estimatedMinutes: 25,
  difficulty: 2,
  testKind: "function",
  description: `## やること

配列 \`arr\` と述語 (boolean を返す関数) \`pred\` を受け取り、 \`[matched, others]\` の **長さ 2 の配列** を返す関数 \`partition\` を \`reduce\` で実装してください。

- \`matched\` … \`pred(x)\` が真の要素 (出現順)
- \`others\` … 真でなかった要素 (出現順)

\`\`\`js
partition([1, 2, 3, 4, 5], (x) => x % 2 === 0);
// → [[2, 4], [1, 3, 5]]

partition([], (x) => x);     // → [[], []]
partition([1, 2], () => true);  // → [[1, 2], []]
\`\`\`

## ポイント

- \`filter\` を 2 回呼べば書けますが、 それでは配列を 2 周してしまいます。 \`reduce\` の初期値を \`[[], []]\` にして **1 周で両方を組み立てる** のがこの問題の狙いです。
- 出現順を保つために、 末尾に \`push\` していくのが素直です。
- AST で **\`filter\` の使用は禁止**、 **\`reduce\` の使用は必須** です。
- 戻り値の **長さは常に 2** で、 入力が空でも \`[[], []]\` を返します。
- 入力配列 \`arr\` を **書き換えない** こと (非破壊)。
`,
  starterFiles: singleFile(`function partition(arr, pred) {
  // reduce の初期値 [[], []] を使って 1 周で matched / others を組み立ててください
}
`),
  entryPoints: ["partition"],
  demoCall: `console.log(partition([1, 2, 3, 4, 5], (x) => x % 2 === 0));`,
  tests: [
    {
      name: "偶数と奇数に分ける",
      code: `JSON.stringify(partition([1, 2, 3, 4, 5], (x) => x % 2 === 0)) === JSON.stringify([[2, 4], [1, 3, 5]])`,
    },
    {
      name: "空配列なら [[], []]",
      code: `JSON.stringify(partition([], (x) => x)) === JSON.stringify([[], []])`,
    },
    {
      name: "全要素が条件に合うときは others が空",
      code: `JSON.stringify(partition([1, 2, 3], () => true)) === JSON.stringify([[1, 2, 3], []])`,
    },
    {
      name: "全要素が条件に合わないときは matched が空",
      code: `JSON.stringify(partition([1, 2, 3], () => false)) === JSON.stringify([[], [1, 2, 3]])`,
    },
    {
      name: "戻り値の長さは常に 2",
      code: `partition([1, 2, 3], (x) => x > 1).length === 2`,
    },
    {
      name: "オブジェクト配列を述語で分ける",
      code: `JSON.stringify(partition([{ ok: true, n: 1 }, { ok: false, n: 2 }, { ok: true, n: 3 }], (o) => o.ok)) === JSON.stringify([[{ ok: true, n: 1 }, { ok: true, n: 3 }], [{ ok: false, n: 2 }]])`,
    },
    {
      name: "元の配列を変更しない (非破壊)",
      code: `(() => {
        const src = [1, 2, 3, 4];
        partition(src, (x) => x % 2 === 0);
        return JSON.stringify(src) === JSON.stringify([1, 2, 3, 4]);
      })()`,
    },
  ],
  hints: [
    "arr.reduce((acc, x) => { if (pred(x)) acc[0].push(x); else acc[1].push(x); return acc; }, [[], []]) のように push で振り分けると O(N)。 [[...yes, x], no] のようなスプレッド版は毎ステップで配列をコピーするので O(N²) になり避けたい。",
    "解答例:\n```js\nfunction partition(arr, pred) {\n  return arr.reduce(\n    (acc, x) => {\n      if (pred(x)) acc[0].push(x);\n      else acc[1].push(x);\n      return acc;\n    },\n    [[], []],\n  );\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で [matched, others] を返す" },
        { kind: "method", name: "reduce", label: "Array.reduce を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "filter", label: "自作課題なので filter は使わない (1 周で実装する)" },
        { kind: "method", name: "forEach", label: "reduce 課題なので forEach は使わない" },
        { kind: "node", nodeType: "ForStatement", label: "reduce 課題なので for は使わない" },
        { kind: "node", nodeType: "ForOfStatement", label: "reduce 課題なので for...of は使わない" },
        { kind: "node", nodeType: "ForInStatement", label: "reduce 課題なので for...in は使わない" },
        { kind: "node", nodeType: "WhileStatement", label: "reduce 課題なので while は使わない" },
        { kind: "node", nodeType: "DoWhileStatement", label: "reduce 課題なので do...while は使わない" },
      ],
    },
  },
  solution: `function partition(arr, pred) {
  return arr.reduce(
    (acc, x) => {
      if (pred(x)) {
        acc[0].push(x);
      } else {
        acc[1].push(x);
      }
      return acc;
    },
    [[], []],
  );
}
`,
  badSolutions: [
    {
      code: `function partition(arr, pred) {
  return [arr.filter(pred), arr.filter((x) => !pred(x))];
}
`,
      description: "filter を 2 回呼んでいて 1 周で実装していない (AST forbidden 違反、 reduce 未使用)",
    },
    {
      code: `function partition(arr, pred) {
  const matched = [];
  const others = [];
  for (const x of arr) {
    if (pred(x)) matched.push(x);
    else others.push(x);
  }
  return [matched, others];
}
`,
      description: "for ループで書いていて reduce を使っていない (AST 必須未充足)",
    },
    {
      code: `function partition(arr, pred) {
  return arr.reduce(
    (acc, x) => {
      if (pred(x)) acc[0].unshift(x);
      else acc[1].unshift(x);
      return acc;
    },
    [[], []],
  );
}
`,
      description: "unshift で先頭に入れているので出現順が逆になる (テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.reduce",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce",
      pageTitle: "Array.prototype.reduce",
    },
    {
      heading: "分割代入",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment",
      pageTitle: "分割代入",
    },
  ],
};
