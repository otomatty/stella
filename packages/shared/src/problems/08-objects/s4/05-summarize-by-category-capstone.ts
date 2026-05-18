import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch08SummarizeByCategoryCapstone: Assignment = {
  id: "S4-Ch08-05-summarize-by-category-capstone",
  stage: "S4",
  chapterId: "Ch08",
  sequence: 5,
  title: "[卒業課題] カテゴリ別に件数と売上合計を集計する",
  newConcept: "動的キーでオブジェクトを初期化し、 ネストしたカウンタ + 集計を 1 周で組み立てる",
  estimatedMinutes: 40,
  difficulty: 3,
  testKind: "function",
  isCapstone: true,
  description: `## やること

これは **S4 卒業課題のひとつ** です。 \`{ name, category, price, sold }\` の形の商品配列 \`items\` を受け取り、 **カテゴリごとに「件数」 と「売上合計 (\`price * sold\` の合計)」 を集計** したオブジェクトを返す関数 \`summarizeByCategory\` を実装してください。

\`\`\`js
summarizeByCategory([
  { name: "Apple",  category: "fruit",  price: 100, sold: 3 },
  { name: "Banana", category: "fruit",  price: 200, sold: 1 },
  { name: "Cola",   category: "drink",  price: 150, sold: 4 },
]);
// → {
//   fruit: { count: 2, totalRevenue: 500 },   // 100*3 + 200*1
//   drink: { count: 1, totalRevenue: 600 },   // 150*4
// }

summarizeByCategory([]);
// → {}
\`\`\`

## ポイント

- これは **配列を 1 周しながら、 動的キーで「カテゴリ → 集計オブジェクト」 を組み立てる** 中規模アルゴリズムです。 S3 卒業課題 \`groupByCategory\` の発展形にあたります。
- 各 \`item\` に対して:
  1. \`result[item.category]\` が **未定義なら \`{ count: 0, totalRevenue: 0 }\` で初期化** する
  2. \`result[item.category].count\` を \`+= 1\`
  3. \`result[item.category].totalRevenue\` に \`item.price * item.sold\` を足す
- 戻り値は **プレーンオブジェクト** (\`Map\` ではない)。 \`Map\` は Ch10 で導入されるため、 ここでは使いません。
- カテゴリの **登場順** はそのままキーの挿入順になります (オブジェクトの挿入順は ES2015 以降保たれます)。
`,
  starterFiles: singleFile(`function summarizeByCategory(items) {
  // 集計結果を入れるための空オブジェクトを用意する


  // for...of で items を 1 件ずつ走査する


  // 現在のカテゴリのキーがまだ無ければ、 説明文の初期形 (件数 0 / 売上合計 0) で初期化する


  // 現在のカテゴリの件数を 1 増やす


  // 現在のカテゴリの売上合計に 単価 * 売上数 を足し込む


  // ループを抜けたら集計結果を return する
}
`),
  entryPoints: ["summarizeByCategory"],
  demoCall: `console.log(summarizeByCategory([{ category: "fruit", price: 100, sold: 3 }, { category: "drink", price: 150, sold: 4 }]));`,
  tests: [
    {
      name: "2 カテゴリ混在の集計",
      code: `(() => {
        const r = summarizeByCategory([
          { name: "Apple",  category: "fruit",  price: 100, sold: 3 },
          { name: "Banana", category: "fruit",  price: 200, sold: 1 },
          { name: "Cola",   category: "drink",  price: 150, sold: 4 },
        ]);
        return r.fruit && r.drink
          && r.fruit.count === 2 && r.fruit.totalRevenue === 500
          && r.drink.count === 1 && r.drink.totalRevenue === 600;
      })()`,
    },
    {
      name: "空配列は空オブジェクト",
      code: `(() => {
        const r = summarizeByCategory([]);
        return r !== null && typeof r === "object" && !Array.isArray(r) && Object.keys(r).length === 0;
      })()`,
    },
    {
      name: "1 カテゴリ・1 アイテム",
      code: `(() => {
        const r = summarizeByCategory([{ category: "x", price: 10, sold: 7 }]);
        return r.x.count === 1 && r.x.totalRevenue === 70;
      })()`,
    },
    {
      name: "同じカテゴリの 3 件を正しく加算",
      code: `(() => {
        const r = summarizeByCategory([
          { category: "g", price: 10, sold: 2 },
          { category: "g", price: 20, sold: 1 },
          { category: "g", price: 5,  sold: 4 },
        ]);
        return r.g.count === 3 && r.g.totalRevenue === 60;
      })()`,
    },
    {
      name: "sold が 0 のアイテムも count は 1 として数える",
      code: `(() => {
        const r = summarizeByCategory([
          { category: "z", price: 100, sold: 0 },
          { category: "z", price: 100, sold: 2 },
        ]);
        return r.z.count === 2 && r.z.totalRevenue === 200;
      })()`,
    },
    {
      name: "戻り値はプレーンオブジェクト (Map ではない)",
      code: `(() => {
        const r = summarizeByCategory([{ category: "x", price: 1, sold: 1 }]);
        return !(r instanceof Map) && r !== null && typeof r === "object" && !Array.isArray(r);
      })()`,
    },
    {
      name: "3 カテゴリの混在",
      code: `(() => {
        const r = summarizeByCategory([
          { category: "a", price: 10, sold: 1 },
          { category: "b", price: 20, sold: 2 },
          { category: "a", price: 30, sold: 3 },
          { category: "c", price: 5,  sold: 5 },
        ]);
        return r.a.count === 2 && r.a.totalRevenue === 100
          && r.b.count === 1 && r.b.totalRevenue === 40
          && r.c.count === 1 && r.c.totalRevenue === 25;
      })()`,
    },
  ],
  hints: [
    "result = {}; for (const item of items) { if (!result[item.category]) result[item.category] = { count: 0, totalRevenue: 0 }; result[item.category].count += 1; result[item.category].totalRevenue += item.price * item.sold; } return result;",
    "解答例:\n```js\nfunction summarizeByCategory(items) {\n  const result = {};\n  for (const item of items) {\n    if (!result[item.category]) {\n      result[item.category] = { count: 0, totalRevenue: 0 };\n    }\n    result[item.category].count += 1;\n    result[item.category].totalRevenue += item.price * item.sold;\n  }\n  return result;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で集計オブジェクトを返す" },
        { kind: "node", nodeType: "ForOfStatement", label: "for...of でアイテムを走査する" },
        { kind: "node", nodeType: "IfStatement", label: "if でキーが未登録なら初期化する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "method", name: "reduce", label: "S4 では reduce を使わない (Ch09 で導入)" },
        { kind: "method", name: "map", label: "S4 では map を使わない (Ch09 で導入)" },
        { kind: "method", name: "filter", label: "S4 では filter を使わない (Ch09 で導入)" },
      ],
    },
  },
  solution: `function summarizeByCategory(items) {
  const result = {};
  for (const item of items) {
    if (!result[item.category]) {
      result[item.category] = { count: 0, totalRevenue: 0 };
    }
    result[item.category].count += 1;
    result[item.category].totalRevenue += item.price * item.sold;
  }
  return result;
}
`,
  badSolutions: [
    {
      code: `function summarizeByCategory(items) {
  const result = new Map();
  for (const item of items) {
    if (!result.has(item.category)) {
      result.set(item.category, { count: 0, totalRevenue: 0 });
    }
    const bucket = result.get(item.category);
    bucket.count += 1;
    bucket.totalRevenue += item.price * item.sold;
  }
  return result;
}
`,
      description: "Map を返している (Ch10 で導入予定、 ここではプレーンオブジェクトを期待 / テスト失敗)",
    },
    {
      code: `function summarizeByCategory(items) {
  const result = {};
  for (const item of items) {
    result[item.category].count += 1;
    result[item.category].totalRevenue += item.price * item.sold;
  }
  return result;
}
`,
      description: "初期化を忘れているので undefined.count で TypeError、 もしくは AST required の IfStatement が無い",
    },
    {
      code: `function summarizeByCategory(items) {
  const result = {};
  for (const item of items) {
    if (!result[item.category]) {
      result[item.category] = { count: 0, totalRevenue: 0 };
    }
    result[item.category].count += 1;
    result[item.category].totalRevenue += item.price;
  }
  return result;
}
`,
      description: "totalRevenue に price * sold ではなく price だけを足している (テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "ブラケット記法",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Property_accessors#bracket_notation",
      pageTitle: "プロパティアクセサー",
    },
    {
      heading: "for...of",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for...of",
      pageTitle: "for...of",
    },
  ],
};
