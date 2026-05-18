import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch09MyMap: Assignment = {
  id: "S4-Ch09-01-my-map",
  stage: "S4",
  chapterId: "Ch09",
  sequence: 1,
  title: "reduce で `map` を自作する",
  newConcept: "高階関数を自作する側に回り、 `reduce` の累積に値を積んで新配列を組み立てる",
  estimatedMinutes: 20,
  difficulty: 1,
  testKind: "function",
  description: `## やること

配列 \`arr\` と変換関数 \`fn\` を受け取り、 \`arr.map(fn)\` と同じ結果の新しい配列を返す関数 \`myMap\` を **\`reduce\` を使って** 実装してください。

\`\`\`js
myMap([1, 2, 3], (x) => x * 2);            // → [2, 4, 6]
myMap(["a", "bb"], (s) => s.length);       // → [1, 2]
myMap([], (x) => x);                       // → []
\`\`\`

## ポイント

- S4 は **アルゴリズム編**。 S3 で「使う側」 だった \`map\` を、 ここで **自作する側** に回って中身を理解します。
- \`reduce\` の初期値を空配列 \`[]\` にして、 1 件ずつ \`acc.push(fn(x))\` で末尾に追加すれば \`map\` と同じ結果になります:
  \`\`\`js
  arr.reduce((acc, x) => {
    acc.push(fn(x));
    return acc;
  }, []);
  \`\`\`
- **計算量**: S4 はアルゴリズム編なので **O(N)** で書くこと。 \`[...acc, fn(x)]\` のような **毎回コピー** はループ全体で **O(N²)** になり NG。 \`push\` で末尾に追加する方が効率的です。
- AST で **\`map\` の使用は禁止** しています (自作問題なので \`arr.map(fn)\` で済ませることはできません)。
- 入力配列 \`arr\` を **書き換えない** こと (非破壊)。
`,
  starterFiles: singleFile(`function myMap(arr, fn) {
  // reduce で arr を走査し、 初期値に空配列を渡して、 各要素に fn を適用した結果を蓄積用配列の末尾へ push する


  // 蓄積用配列を return する (= reduce の最終結果を return する)
}
`),
  entryPoints: ["myMap"],
  demoCall: `console.log(myMap([1, 2, 3], (x) => x * 2));`,
  tests: [
    {
      name: "数値を 2 倍に変換",
      code: `JSON.stringify(myMap([1, 2, 3], (x) => x * 2)) === JSON.stringify([2, 4, 6])`,
    },
    {
      name: "文字列の length を取り出す",
      code: `JSON.stringify(myMap(["a", "bb", "ccc"], (s) => s.length)) === JSON.stringify([1, 2, 3])`,
    },
    {
      name: "空配列なら空配列を返す",
      code: `JSON.stringify(myMap([], (x) => x)) === JSON.stringify([])`,
    },
    {
      name: "戻り値は配列",
      code: `Array.isArray(myMap([1], (x) => x))`,
    },
    {
      name: "元の配列を変更しない (非破壊)",
      code: `(() => {
        const src = [1, 2, 3];
        myMap(src, (x) => x * 10);
        return JSON.stringify(src) === JSON.stringify([1, 2, 3]);
      })()`,
    },
    {
      name: "オブジェクトのプロパティを取り出す",
      code: `JSON.stringify(myMap([{ name: "A" }, { name: "B" }], (o) => o.name)) === JSON.stringify(["A", "B"])`,
    },
  ],
  hints: [
    "arr.reduce((acc, x) => { acc.push(fn(x)); return acc; }, []) のように push を使うと O(N) で効率的。 [...acc, fn(x)] でも結果は同じだが毎ステップでコピーが走り O(N²) になるので避けたい。",
    "解答例:\n```js\nfunction myMap(arr, fn) {\n  return arr.reduce((acc, x) => {\n    acc.push(fn(x));\n    return acc;\n  }, []);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で配列を返す" },
        { kind: "method", name: "reduce", label: "Array.reduce を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "map", label: "自作課題なので組み込みの map は使わない" },
        { kind: "method", name: "forEach", label: "forEach ではなく reduce で組み立てる" },
        { kind: "node", nodeType: "ForStatement", label: "reduce 課題なので for は使わない" },
        { kind: "node", nodeType: "ForOfStatement", label: "reduce 課題なので for...of は使わない" },
        { kind: "node", nodeType: "ForInStatement", label: "reduce 課題なので for...in は使わない" },
        { kind: "node", nodeType: "WhileStatement", label: "reduce 課題なので while は使わない" },
        { kind: "node", nodeType: "DoWhileStatement", label: "reduce 課題なので do...while は使わない" },
      ],
    },
  },
  solution: `function myMap(arr, fn) {
  return arr.reduce((acc, x) => {
    acc.push(fn(x));
    return acc;
  }, []);
}
`,
  badSolutions: [
    {
      code: `function myMap(arr, fn) {
  return arr.map(fn);
}
`,
      description: "組み込みの map で済ませている (AST forbidden 違反、 reduce 必須未充足)",
    },
    {
      code: `function myMap(arr, fn) {
  const result = [];
  arr.forEach((x) => result.push(fn(x)));
  return result;
}
`,
      description: "forEach + push で書いていて reduce を使っていない (AST 必須未充足、 forEach 禁止違反)",
    },
    {
      code: `function myMap(arr, fn) {
  return arr.reduce((acc, x) => {
    acc.push(fn(x));
  }, []);
}
`,
      description: "コールバックで acc を return していないため、 次の周回で acc が undefined になり acc.push 呼び出しで TypeError になる (テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.reduce",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce",
      pageTitle: "Array.prototype.reduce",
    },
    {
      heading: "Array.prototype.map",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/map",
      pageTitle: "Array.prototype.map",
    },
  ],
};
