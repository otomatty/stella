import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch08GroupByCapstone: Assignment = {
  id: "S3-Ch08-08-group-by-capstone",
  stage: "S3",
  chapterId: "Ch08",
  sequence: 8,
  title: "[卒業課題] アイテム配列をカテゴリでグルーピングする",
  newConcept: "配列とオブジェクトを組み合わせた中規模アルゴリズム",
  estimatedMinutes: 25,
  difficulty: 3,
  testKind: "function",
  isCapstone: true,
  description: `## やること

\`{ category: string, name: string }\` の形のアイテム配列 \`items\` を受け取り、 同じ \`category\` の \`name\` を配列に集めた **オブジェクト** を返す関数 \`groupByCategory\` を実装してください。

\`\`\`js
groupByCategory([
  { category: "fruit", name: "apple" },
  { category: "fruit", name: "banana" },
  { category: "veg",   name: "carrot" },
]);
// → { fruit: ["apple", "banana"], veg: ["carrot"] }

groupByCategory([]);
// → {}

groupByCategory([{ category: "x", name: "a" }]);
// → { x: ["a"] }
\`\`\`

## ポイント

- これは **S3 卒業課題** のひとつ。 「配列を走査して、 オブジェクトの中の配列を伸ばす」 という、 オブジェクトと配列の入れ子操作です。
- 各アイテム \`item\` について、 \`result[item.category]\` が **未定義なら空配列を作る** → \`push(item.name)\`。
`,
  starterFiles: singleFile(`function groupByCategory(items) {
  // ここを実装してください
}
`),
  entryPoints: ["groupByCategory"],
  demoCall: `console.log(groupByCategory([{ category: "fruit", name: "apple" }, { category: "veg", name: "carrot" }]));`,
  tests: [
    {
      name: "fruit と veg にグルーピング",
      code: `(() => {
        const r = groupByCategory([
          { category: "fruit", name: "apple" },
          { category: "fruit", name: "banana" },
          { category: "veg", name: "carrot" },
        ]);
        return JSON.stringify(r.fruit) === '["apple","banana"]'
          && JSON.stringify(r.veg) === '["carrot"]';
      })()`,
    },
    {
      name: "空配列は空オブジェクト",
      code: `(() => { const r = groupByCategory([]); return typeof r === "object" && Object.keys(r).length === 0; })()`,
    },
    {
      name: "1 アイテムだけのケース",
      code: `(() => { const r = groupByCategory([{ category: "x", name: "a" }]); return JSON.stringify(r.x) === '["a"]'; })()`,
    },
    {
      name: "順序が保たれる",
      code: `(() => {
        const r = groupByCategory([
          { category: "g", name: "1" },
          { category: "g", name: "2" },
          { category: "g", name: "3" },
        ]);
        return JSON.stringify(r.g) === '["1","2","3"]';
      })()`,
    },
    {
      name: "3 カテゴリ混在",
      code: `(() => {
        const r = groupByCategory([
          { category: "a", name: "x" },
          { category: "b", name: "y" },
          { category: "a", name: "z" },
          { category: "c", name: "w" },
        ]);
        return r.a.length === 2 && r.b.length === 1 && r.c.length === 1
          && r.a[0] === "x" && r.a[1] === "z";
      })()`,
    },
  ],
  hints: [
    "result = {}; for (const item of items) { if (!result[item.category]) result[item.category] = []; result[item.category].push(item.name); }",
    "解答例:\n```js\nfunction groupByCategory(items) {\n  const result = {};\n  for (const item of items) {\n    if (!result[item.category]) {\n      result[item.category] = [];\n    }\n    result[item.category].push(item.name);\n  }\n  return result;\n}\n```",
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
  solution: `function groupByCategory(items) {
  const result = {};
  for (const item of items) {
    if (!result[item.category]) {
      result[item.category] = [];
    }
    result[item.category].push(item.name);
  }
  return result;
}
`,
  badSolutions: [
    {
      code: `function groupByCategory(items) {
  const result = {};
  for (const item of items) {
    result[item.category] = item.name;
  }
  return result;
}
`,
      description: "上書きしているので配列にならず、 各カテゴリの最後のアイテムだけ残る",
    },
    {
      code: `function groupByCategory(items) {
  return items;
}
`,
      description: "そのまま配列を返している",
    },
  ],
  mdnSections: [
    {
      heading: "ブラケット記法",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Property_accessors#bracket_notation",
      pageTitle: "プロパティアクセサー",
    },
  ],
};
