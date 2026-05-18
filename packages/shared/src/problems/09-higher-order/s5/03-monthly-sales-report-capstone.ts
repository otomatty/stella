import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s5Ch09MonthlySalesReportCapstone: Assignment = {
  id: "S5-Ch09-03-monthly-sales-report-capstone",
  stage: "S5",
  chapterId: "Ch09",
  sequence: 3,
  title: "[卒業課題] 売上ログから月次レポートを 5 段パイプラインで生成する",
  newConcept:
    "filter → map → reduce + Map グルーピング → 各月のサマリ計算 → sort の 5 段以上のパイプラインを、 役割の違う 5 つの関数に切り出し、 メインから順に呼び出して合成する。 高階関数を組み合わせた 「データ変換のフロー設計」 を統合的に練習する S5 卒業課題",
  estimatedMinutes: 80,
  difficulty: 3,
  testKind: "function",
  isCapstone: true,
  description: `## やること

これは **Ch09 高階関数の S5 卒業課題のひとつ** です。 注文ログ \`[{ date, category, qty, price, refunded }]\` から、 **月ごとの売上レポート** を生成する処理を、 **役割の違う 5 つの関数** に切り分けて実装してください。

### 入出力

入力:

\`\`\`js
const orders = [
  { date: "2026-01-15", category: "fruit", qty: 2, price: 100, refunded: false },
  { date: "2026-01-20", category: "veg",   qty: 3, price: 200, refunded: false },
  { date: "2026-01-25", category: "veg",   qty: 1, price: 200, refunded: true  }, // 返品なので除外
  { date: "2026-02-03", category: "fruit", qty: 5, price: 100, refunded: false },
];
\`\`\`

出力 (月昇順):

\`\`\`js
[
  { month: "2026-01", totalRevenue: 800, orderCount: 2, topCategory: "veg"   },
  { month: "2026-02", totalRevenue: 500, orderCount: 1, topCategory: "fruit" },
]
\`\`\`

\`totalRevenue\` は \`qty * price\` の月合計、 \`orderCount\` はその月の注文件数、 \`topCategory\` は **その月で売上 (\`qty * price\` の合計) が最大のカテゴリ**。

### 実装する 5 関数

- \`excludeRefunded(orders)\` — \`refunded === false\` の注文だけ残す (\`filter\`)
- \`withRevenue(orders)\` — 各注文に \`month\` (\`date\` の先頭 7 文字: 例 \`"2026-01"\`) と \`revenue\` (\`qty * price\`) を追加した **新しい配列** を返す (\`map\` + スプレッド)
- \`groupByMonth(orders)\` — \`month\` をキーに注文配列を \`Map<string, Order[]>\` にまとめる (\`reduce\` + \`new Map()\`)。 同じ月に届いた順をそのまま保つ
- \`summarizeMonth(month, ordersOfMonth)\` — 1 つの月の注文配列から \`{ month, totalRevenue, orderCount, topCategory }\` を計算する。 \`topCategory\` は内部で 「カテゴリ → 売上合計」 の Map を \`reduce\` で作り、 最も大きいカテゴリを選ぶ
- \`monthlySalesReport(orders)\` — 上の 4 関数を順に呼び、 最後に \`month\` 昇順に \`sort\` した配列を返す

### 守るべき設計

- \`monthlySalesReport\` の中で \`filter\` / \`map\` / \`reduce\` を **直接書かない**。 必ず上の 4 ヘルパー関数を呼ぶ (ロジックを 1 箇所にまとめる)。
- どの関数も入力配列・入力オブジェクトを **書き換えない**。 \`withRevenue\` は \`{ ...order, month, revenue }\` のように **スプレッドで新オブジェクト** を作る。
- \`for\` / \`for...of\` / \`while\` / \`forEach\` は使わない。 必ず \`filter\` / \`map\` / \`reduce\` で書く。
- \`monthlySalesReport\` の最後の \`sort\` は **元配列を破壊しない** ように \`[...arr].sort(...)\` でコピーしてから並べ替える。
- \`topCategory\` が同点のときは、 **最初に登場したカテゴリ** を優先する (Map の挿入順 + Array.sort の安定性で自然に達成できる)。

\`\`\`js
const orders = [
  { date: "2026-01-15", category: "fruit", qty: 2, price: 100, refunded: false },
  { date: "2026-01-20", category: "veg",   qty: 3, price: 200, refunded: false },
  { date: "2026-02-03", category: "fruit", qty: 5, price: 100, refunded: false },
];

excludeRefunded(orders).length;          // → 3 (返品なしのテストデータ)
withRevenue([orders[0]])[0].month;       // → "2026-01"
withRevenue([orders[0]])[0].revenue;     // → 200
groupByMonth(withRevenue(orders)).size;  // → 2
summarizeMonth("2026-01", [...]);        // → { month: "2026-01", totalRevenue: 800, orderCount: 2, topCategory: "veg" }
monthlySalesReport(orders);
// → [
//     { month: "2026-01", totalRevenue: 800, orderCount: 2, topCategory: "veg"   },
//     { month: "2026-02", totalRevenue: 500, orderCount: 1, topCategory: "fruit" },
//   ]
\`\`\`

## ポイント

- これは S5 卒業課題です。 S5 全体のテーマ — 「**役割の違う複数の純粋関数を協調させる**」 「**4 段以上のパイプライン**」 「**pipe / 合成で再利用する**」 — を 1 つのドメインで統合する集大成。
- **5 段の流れ**: \`excludeRefunded\` → \`withRevenue\` → \`groupByMonth\` → 各月で \`summarizeMonth\` を \`map\` → \`sort\` で月昇順、 という流れを **頭で組み立ててから書き始める** こと。
- \`groupByMonth\` の戻り値は **\`Map\`** (plain object ではない)。 \`reduce\` の初期値を \`new Map()\` にし、 \`map.set(key, [...(map.get(key) ?? []), order])\` の形で 1 件ずつ追加する (S4 \`groupBy\` で練習した形)。
- \`summarizeMonth\` の中の \`topCategory\` の求め方: カテゴリ → 売上合計の Map を \`reduce\` で作り、 \`[...map.entries()].reduce(...)\` で 「現在の最大」 を保持しながら 1 周する (\`Math.max\` だけだとカテゴリ名が分からないので注意)。 **同点は先に出たカテゴリを優先** (\`>\` で比較し、 \`>=\` にしない)。
- \`monthlySalesReport\` の最後の \`sort\` は **\`[...arr].sort(...)\`** で必ずコピーすること。 \`Array.from(map.entries())\` の戻り値を直接 \`sort\` すると、 ローカルの配列なので問題は起きないが、 「sort はコピーしてから」 の規律を S5 全体で守るためあえて統一する。
- AST で \`filter\` / \`map\` / \`reduce\` の **3 つすべて** を必須にしているので、 単純な \`for\` ループでは通りません。
`,
  starterFiles: singleFile(`function excludeRefunded(orders) {
  // refunded === false の注文だけ Array.filter で残す。
}

function withRevenue(orders) {
  // 各注文に month (date.slice(0, 7)) と revenue (qty * price) を
  // スプレッドで足した 新しいオブジェクトの配列を Array.map で作る。
}

function groupByMonth(orders) {
  // Array.reduce + new Map() で month をキーに注文をグルーピングする。
  // map.set(key, [...(map.get(key) ?? []), order]); の形で 1 件ずつ追加。
}

function summarizeMonth(month, ordersOfMonth) {
  // 1) totalRevenue = ordersOfMonth.reduce((acc, o) => acc + o.revenue, 0)
  // 2) orderCount = ordersOfMonth.length
  // 3) カテゴリ別売上 Map を reduce で作り、 entries() を reduce で
  //    「最大カテゴリ (同点は先勝ち)」 に畳み込む
  // 4) { month, totalRevenue, orderCount, topCategory } を return。
}

function monthlySalesReport(orders) {
  // 上の 4 関数を順に呼ぶ。
  // const valid = excludeRefunded(orders);
  // const enriched = withRevenue(valid);
  // const byMonth = groupByMonth(enriched);
  // const summaries = [...byMonth.entries()].map(([m, list]) => summarizeMonth(m, list));
  // return [...summaries].sort((a, b) => a.month < b.month ? -1 : a.month > b.month ? 1 : 0);
}
`),
  entryPoints: [
    "excludeRefunded",
    "withRevenue",
    "groupByMonth",
    "summarizeMonth",
    "monthlySalesReport",
  ],
  demoCall: `console.log(JSON.stringify(monthlySalesReport([
  { date: "2026-01-15", category: "fruit", qty: 2, price: 100, refunded: false },
  { date: "2026-01-20", category: "veg",   qty: 3, price: 200, refunded: false },
  { date: "2026-02-03", category: "fruit", qty: 5, price: 100, refunded: false },
]), null, 2));`,
  tests: [
    {
      name: "excludeRefunded: refunded=true を除外する",
      code: `(() => {
        const r = excludeRefunded([
          { date: "2026-01-01", category: "a", qty: 1, price: 1, refunded: false },
          { date: "2026-01-02", category: "b", qty: 1, price: 1, refunded: true  },
          { date: "2026-01-03", category: "c", qty: 1, price: 1, refunded: false },
        ]);
        return r.length === 2 && r[0].category === "a" && r[1].category === "c";
      })()`,
    },
    {
      name: "excludeRefunded: 空配列なら空配列",
      code: `(() => {
        const r = excludeRefunded([]);
        return Array.isArray(r) && r.length === 0;
      })()`,
    },
    {
      name: "withRevenue: month と revenue を 元のフィールドに加えた新オブジェクト",
      code: `(() => {
        const r = withRevenue([
          { date: "2026-01-15", category: "fruit", qty: 3, price: 100, refunded: false },
        ]);
        return r.length === 1
          && r[0].month === "2026-01"
          && r[0].revenue === 300
          && r[0].category === "fruit"
          && r[0].qty === 3
          && r[0].price === 100
          && r[0].refunded === false;
      })()`,
    },
    {
      name: "withRevenue: 元のオブジェクトに month / revenue を生やさない (非破壊)",
      code: `(() => {
        const src = { date: "2026-01-15", category: "fruit", qty: 2, price: 100, refunded: false };
        withRevenue([src]);
        return !Object.hasOwn(src, "month") && !Object.hasOwn(src, "revenue");
      })()`,
    },
    {
      name: "groupByMonth: month をキーにした Map を返す",
      code: `(() => {
        const m = groupByMonth([
          { month: "2026-01", revenue: 100, category: "a" },
          { month: "2026-02", revenue: 200, category: "b" },
          { month: "2026-01", revenue: 50,  category: "c" },
        ]);
        return m instanceof Map
          && m.size === 2
          && m.get("2026-01").length === 2
          && m.get("2026-02").length === 1;
      })()`,
    },
    {
      name: "groupByMonth: 同じ月では入力順を保つ",
      code: `(() => {
        const m = groupByMonth([
          { month: "2026-01", revenue: 1, category: "first"  },
          { month: "2026-01", revenue: 2, category: "second" },
          { month: "2026-01", revenue: 3, category: "third"  },
        ]);
        const list = m.get("2026-01");
        return list[0].category === "first"
          && list[1].category === "second"
          && list[2].category === "third";
      })()`,
    },
    {
      name: "groupByMonth: 空配列なら空 Map",
      code: `(() => {
        const m = groupByMonth([]);
        return m instanceof Map && m.size === 0;
      })()`,
    },
    {
      name: "summarizeMonth: totalRevenue と orderCount を集計する",
      code: `(() => {
        const s = summarizeMonth("2026-01", [
          { month: "2026-01", revenue: 200, category: "fruit" },
          { month: "2026-01", revenue: 600, category: "veg"   },
        ]);
        return s.month === "2026-01"
          && s.totalRevenue === 800
          && s.orderCount === 2;
      })()`,
    },
    {
      name: "summarizeMonth: topCategory は売上合計が最大のカテゴリ",
      code: `(() => {
        const s = summarizeMonth("2026-01", [
          { month: "2026-01", revenue: 100, category: "fruit" },
          { month: "2026-01", revenue: 250, category: "veg"   },
          { month: "2026-01", revenue: 50,  category: "fruit" },
        ]);
        return s.topCategory === "veg";
      })()`,
    },
    {
      name: "summarizeMonth: topCategory は 1 行ずつではなく カテゴリ別の合計で比較する",
      code: `(() => {
        const s = summarizeMonth("2026-01", [
          { month: "2026-01", revenue: 100, category: "fruit" },
          { month: "2026-01", revenue: 100, category: "fruit" },
          { month: "2026-01", revenue: 150, category: "veg"   },
        ]);
        // fruit 合計 200 > veg 合計 150。 行単位の max なら "veg" になってしまう。
        return s.topCategory === "fruit";
      })()`,
    },
    {
      name: "summarizeMonth: topCategory 同点は先に登場したカテゴリ",
      code: `(() => {
        const s = summarizeMonth("2026-01", [
          { month: "2026-01", revenue: 100, category: "a" },
          { month: "2026-01", revenue: 100, category: "b" },
        ]);
        return s.topCategory === "a";
      })()`,
    },
    {
      name: "summarizeMonth: 1 件だけのケース",
      code: `(() => {
        const s = summarizeMonth("2026-03", [
          { month: "2026-03", revenue: 42, category: "solo" },
        ]);
        return s.month === "2026-03"
          && s.totalRevenue === 42
          && s.orderCount === 1
          && s.topCategory === "solo";
      })()`,
    },
    {
      name: "monthlySalesReport: 月次サマリ配列を 月昇順で返す",
      code: `(() => {
        const r = monthlySalesReport([
          { date: "2026-02-03", category: "fruit", qty: 5, price: 100, refunded: false },
          { date: "2026-01-15", category: "fruit", qty: 2, price: 100, refunded: false },
          { date: "2026-01-20", category: "veg",   qty: 3, price: 200, refunded: false },
        ]);
        return r.length === 2
          && r[0].month === "2026-01" && r[0].totalRevenue === 800 && r[0].orderCount === 2 && r[0].topCategory === "veg"
          && r[1].month === "2026-02" && r[1].totalRevenue === 500 && r[1].orderCount === 1 && r[1].topCategory === "fruit";
      })()`,
    },
    {
      name: "monthlySalesReport: 返品 (refunded=true) は集計に含めない",
      code: `(() => {
        const r = monthlySalesReport([
          { date: "2026-01-15", category: "fruit", qty: 2, price: 100, refunded: false },
          { date: "2026-01-25", category: "veg",   qty: 1, price: 200, refunded: true  },
        ]);
        return r.length === 1
          && r[0].month === "2026-01"
          && r[0].totalRevenue === 200
          && r[0].orderCount === 1
          && r[0].topCategory === "fruit";
      })()`,
    },
    {
      name: "monthlySalesReport: 空配列なら空配列",
      code: `(() => {
        const r = monthlySalesReport([]);
        return Array.isArray(r) && r.length === 0;
      })()`,
    },
    {
      name: "monthlySalesReport: 入力順が逆でも 月昇順で並ぶ",
      code: `(() => {
        const r = monthlySalesReport([
          { date: "2026-12-01", category: "a", qty: 1, price: 10, refunded: false },
          { date: "2026-03-01", category: "b", qty: 1, price: 20, refunded: false },
          { date: "2026-07-01", category: "c", qty: 1, price: 30, refunded: false },
        ]);
        return r.length === 3
          && r[0].month === "2026-03"
          && r[1].month === "2026-07"
          && r[2].month === "2026-12";
      })()`,
    },
    {
      name: "monthlySalesReport: 元の orders 配列・要素を破壊しない",
      code: `(() => {
        const src = [
          { date: "2026-01-15", category: "fruit", qty: 2, price: 100, refunded: false },
          { date: "2026-02-03", category: "fruit", qty: 5, price: 100, refunded: false },
        ];
        const before = JSON.stringify(src);
        monthlySalesReport(src);
        return JSON.stringify(src) === before
          && !Object.hasOwn(src[0], "month")
          && !Object.hasOwn(src[0], "revenue");
      })()`,
    },
    {
      name: "monthlySalesReport: 同じ入力で何度呼んでも同じ結果 (純粋性)",
      code: `(() => {
        const src = [
          { date: "2026-01-15", category: "fruit", qty: 2, price: 100, refunded: false },
          { date: "2026-02-03", category: "veg",   qty: 5, price: 100, refunded: false },
        ];
        const a = JSON.stringify(monthlySalesReport(src));
        const b = JSON.stringify(monthlySalesReport(src));
        return a === b;
      })()`,
    },
    {
      name: "統合シナリオ: 3 ヶ月 × 複数カテゴリ × 返品混在",
      code: `(() => {
        const r = monthlySalesReport([
          { date: "2026-01-05", category: "fruit", qty: 1, price: 100, refunded: false },
          { date: "2026-01-10", category: "fruit", qty: 1, price: 100, refunded: false },
          { date: "2026-01-15", category: "veg",   qty: 1, price: 100, refunded: false },
          { date: "2026-01-20", category: "veg",   qty: 1, price: 100, refunded: true  },
          { date: "2026-02-01", category: "veg",   qty: 2, price: 200, refunded: false },
          { date: "2026-02-15", category: "fruit", qty: 1, price: 100, refunded: false },
          { date: "2026-03-01", category: "meat",  qty: 3, price: 500, refunded: false },
        ]);
        return r.length === 3
          && r[0].month === "2026-01"
          && r[0].orderCount === 3
          && r[0].totalRevenue === 300
          && r[0].topCategory === "fruit"
          && r[1].month === "2026-02"
          && r[1].orderCount === 2
          && r[1].totalRevenue === 500
          && r[1].topCategory === "veg"
          && r[2].month === "2026-03"
          && r[2].orderCount === 1
          && r[2].totalRevenue === 1500
          && r[2].topCategory === "meat";
      })()`,
    },
  ],
  hints: [
    "excludeRefunded は orders.filter((o) => !o.refunded)、 withRevenue は orders.map((o) => ({ ...o, month: o.date.slice(0, 7), revenue: o.qty * o.price })) の 1 行で書けます。",
    "groupByMonth は S4 の groupBy と同じ形。 orders.reduce((map, o) => { map.set(o.month, [...(map.get(o.month) ?? []), o]); return map; }, new Map()) で 1 周。 Map の挿入順 = 各月が最初に登場した順 になります。",
    "summarizeMonth の topCategory は、 まず 「カテゴリ別売上 Map」 を reduce で作り、 [...map.entries()] にしてから また reduce で 「現在のトップ」 を保持しながら 1 周します。 比較は acc[1] >= cur[1] ではなく acc[1] > cur[1] にすることで 「同点は先に出たカテゴリ」 を優先できます (Map の挿入順が前から並ぶため)。",
    "monthlySalesReport は ヘルパー関数だけを呼ぶ集約点として書くこと。 const valid = excludeRefunded(orders); const enriched = withRevenue(valid); const byMonth = groupByMonth(enriched); const summaries = [...byMonth.entries()].map(([m, list]) => summarizeMonth(m, list)); return [...summaries].sort((a, b) => a.month < b.month ? -1 : a.month > b.month ? 1 : 0);",
    "解答例:\n```js\nfunction excludeRefunded(orders) {\n  return orders.filter((o) => !o.refunded);\n}\n\nfunction withRevenue(orders) {\n  return orders.map((o) => ({\n    ...o,\n    month: o.date.slice(0, 7),\n    revenue: o.qty * o.price,\n  }));\n}\n\nfunction groupByMonth(orders) {\n  return orders.reduce((map, o) => {\n    map.set(o.month, [...(map.get(o.month) ?? []), o]);\n    return map;\n  }, new Map());\n}\n\nfunction summarizeMonth(month, ordersOfMonth) {\n  const totalRevenue = ordersOfMonth.reduce((acc, o) => acc + o.revenue, 0);\n  const orderCount = ordersOfMonth.length;\n  const byCategory = ordersOfMonth.reduce((map, o) => {\n    map.set(o.category, (map.get(o.category) ?? 0) + o.revenue);\n    return map;\n  }, new Map());\n  const topCategory = [...byCategory.entries()].reduce(\n    (best, cur) => (best === null || cur[1] > best[1] ? cur : best),\n    null,\n  )[0];\n  return { month, totalRevenue, orderCount, topCategory };\n}\n\nfunction monthlySalesReport(orders) {\n  const valid = excludeRefunded(orders);\n  const enriched = withRevenue(valid);\n  const byMonth = groupByMonth(enriched);\n  const summaries = [...byMonth.entries()].map(([m, list]) =>\n    summarizeMonth(m, list),\n  );\n  return [...summaries].sort((a, b) =>\n    a.month < b.month ? -1 : a.month > b.month ? 1 : 0,\n  );\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "FunctionDeclaration", label: "5 関数 (excludeRefunded / withRevenue / groupByMonth / summarizeMonth / monthlySalesReport) を function 宣言で書く" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で結果を返す" },
        { kind: "method", name: "filter", label: "excludeRefunded で Array.filter を使う" },
        { kind: "method", name: "map", label: "withRevenue と 月ごとのサマリ生成で Array.map を使う" },
        { kind: "method", name: "reduce", label: "groupByMonth / summarizeMonth で Array.reduce を使う" },
        { kind: "method", name: "sort", label: "monthlySalesReport で月昇順に Array.sort する" },
        { kind: "node", nodeType: "NewExpression", label: "new Map() で集計コンテナを作る" },
        { kind: "node", nodeType: "SpreadElement", label: "{ ...o, month, revenue } のスプレッドで非破壊更新する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
        { kind: "node", nodeType: "ForStatement", label: "高階関数で書くので for は使わない" },
        { kind: "node", nodeType: "ForOfStatement", label: "高階関数で書くので for...of は使わない" },
        { kind: "node", nodeType: "ForInStatement", label: "高階関数で書くので for...in は使わない" },
        { kind: "node", nodeType: "WhileStatement", label: "高階関数で書くので while は使わない" },
        { kind: "node", nodeType: "DoWhileStatement", label: "高階関数で書くので do...while は使わない" },
        { kind: "method", name: "forEach", label: "filter / map / reduce で書くので forEach は使わない" },
      ],
    },
  },
  solution: `function excludeRefunded(orders) {
  return orders.filter((o) => !o.refunded);
}

function withRevenue(orders) {
  return orders.map((o) => ({
    ...o,
    month: o.date.slice(0, 7),
    revenue: o.qty * o.price,
  }));
}

function groupByMonth(orders) {
  return orders.reduce((map, o) => {
    map.set(o.month, [...(map.get(o.month) ?? []), o]);
    return map;
  }, new Map());
}

function summarizeMonth(month, ordersOfMonth) {
  const totalRevenue = ordersOfMonth.reduce((acc, o) => acc + o.revenue, 0);
  const orderCount = ordersOfMonth.length;
  const byCategory = ordersOfMonth.reduce((map, o) => {
    map.set(o.category, (map.get(o.category) ?? 0) + o.revenue);
    return map;
  }, new Map());
  const topCategory = [...byCategory.entries()].reduce(
    (best, cur) => (best === null || cur[1] > best[1] ? cur : best),
    null,
  )[0];
  return { month, totalRevenue, orderCount, topCategory };
}

function monthlySalesReport(orders) {
  const valid = excludeRefunded(orders);
  const enriched = withRevenue(valid);
  const byMonth = groupByMonth(enriched);
  const summaries = [...byMonth.entries()].map(([m, list]) =>
    summarizeMonth(m, list),
  );
  return [...summaries].sort((a, b) =>
    a.month < b.month ? -1 : a.month > b.month ? 1 : 0,
  );
}
`,
  badSolutions: [
    {
      code: `function excludeRefunded(orders) {
  return orders.filter((o) => !o.refunded);
}

function withRevenue(orders) {
  return orders.map((o) => {
    o.month = o.date.slice(0, 7);
    o.revenue = o.qty * o.price;
    return o;
  });
}

function groupByMonth(orders) {
  return orders.reduce((map, o) => {
    map.set(o.month, [...(map.get(o.month) ?? []), o]);
    return map;
  }, new Map());
}

function summarizeMonth(month, ordersOfMonth) {
  const totalRevenue = ordersOfMonth.reduce((acc, o) => acc + o.revenue, 0);
  const orderCount = ordersOfMonth.length;
  const byCategory = ordersOfMonth.reduce((map, o) => {
    map.set(o.category, (map.get(o.category) ?? 0) + o.revenue);
    return map;
  }, new Map());
  const topCategory = [...byCategory.entries()].reduce(
    (best, cur) => (best === null || cur[1] > best[1] ? cur : best),
    null,
  )[0];
  return { month, totalRevenue, orderCount, topCategory };
}

function monthlySalesReport(orders) {
  const valid = excludeRefunded(orders);
  const enriched = withRevenue(valid);
  const byMonth = groupByMonth(enriched);
  const summaries = [...byMonth.entries()].map(([m, list]) =>
    summarizeMonth(m, list),
  );
  return [...summaries].sort((a, b) =>
    a.month < b.month ? -1 : a.month > b.month ? 1 : 0,
  );
}
`,
      description: "withRevenue が o.month = ... と o.revenue = ... で 元のオブジェクトを直接書き換えている。 「非破壊」 テストが失敗し、 AST required の SpreadElement も未充足になる",
    },
    {
      code: `function excludeRefunded(orders) {
  return orders.filter((o) => !o.refunded);
}

function withRevenue(orders) {
  return orders.map((o) => ({
    ...o,
    month: o.date.slice(0, 7),
    revenue: o.qty * o.price,
  }));
}

function groupByMonth(orders) {
  const m = new Map();
  for (const o of orders) {
    m.set(o.month, [...(m.get(o.month) ?? []), o]);
  }
  return m;
}

function summarizeMonth(month, ordersOfMonth) {
  let totalRevenue = 0;
  for (const o of ordersOfMonth) {
    totalRevenue += o.revenue;
  }
  return { month, totalRevenue, orderCount: ordersOfMonth.length, topCategory: ordersOfMonth[0].category };
}

function monthlySalesReport(orders) {
  const valid = excludeRefunded(orders);
  const enriched = withRevenue(valid);
  const byMonth = groupByMonth(enriched);
  const summaries = [...byMonth.entries()].map(([m, list]) =>
    summarizeMonth(m, list),
  );
  return [...summaries].sort((a, b) =>
    a.month < b.month ? -1 : a.month > b.month ? 1 : 0,
  );
}
`,
      description: "groupByMonth / summarizeMonth で for...of を使っており、 Ch09 の主題 (reduce で集計する) を回避している。 さらに topCategory を 「最初の要素のカテゴリ」 で済ませているのでテストでも失敗する (AST forbidden: ForOfStatement / AST required: reduce が未充足)",
    },
    {
      code: `function excludeRefunded(orders) {
  return orders.filter((o) => !o.refunded);
}

function withRevenue(orders) {
  return orders.map((o) => ({
    ...o,
    month: o.date.slice(0, 7),
    revenue: o.qty * o.price,
  }));
}

function groupByMonth(orders) {
  return orders.reduce((map, o) => {
    map.set(o.month, [...(map.get(o.month) ?? []), o]);
    return map;
  }, new Map());
}

function summarizeMonth(month, ordersOfMonth) {
  const totalRevenue = ordersOfMonth.reduce((acc, o) => acc + o.revenue, 0);
  const orderCount = ordersOfMonth.length;
  const byCategory = ordersOfMonth.reduce((map, o) => {
    map.set(o.category, (map.get(o.category) ?? 0) + o.revenue);
    return map;
  }, new Map());
  const topCategory = [...byCategory.entries()].reduce(
    (best, cur) => (best === null || cur[1] >= best[1] ? cur : best),
    null,
  )[0];
  return { month, totalRevenue, orderCount, topCategory };
}

function monthlySalesReport(orders) {
  const valid = excludeRefunded(orders);
  const enriched = withRevenue(valid);
  const byMonth = groupByMonth(enriched);
  const summaries = [...byMonth.entries()].map(([m, list]) =>
    summarizeMonth(m, list),
  );
  return [...summaries].sort((a, b) =>
    a.month < b.month ? -1 : a.month > b.month ? 1 : 0,
  );
}
`,
      description: "topCategory の比較で >= を使っているため、 同点のときに 後から登場したカテゴリで上書きされ、 「同点は先勝ち」 テストが失敗する (>= ではなく > にすべき)",
    },
    {
      code: `function excludeRefunded(orders) {
  return orders.filter((o) => !o.refunded);
}

function withRevenue(orders) {
  return orders.map((o) => ({
    ...o,
    month: o.date.slice(0, 7),
    revenue: o.qty * o.price,
  }));
}

function groupByMonth(orders) {
  return orders.reduce((map, o) => {
    map.set(o.month, [...(map.get(o.month) ?? []), o]);
    return map;
  }, new Map());
}

function summarizeMonth(month, ordersOfMonth) {
  const totalRevenue = ordersOfMonth.reduce((acc, o) => acc + o.revenue, 0);
  const orderCount = ordersOfMonth.length;
  const topCategory = ordersOfMonth.reduce(
    (best, o) => (best === null || o.revenue > best.revenue ? o : best),
    null,
  ).category;
  return { month, totalRevenue, orderCount, topCategory };
}

function monthlySalesReport(orders) {
  const valid = excludeRefunded(orders);
  const enriched = withRevenue(valid);
  const byMonth = groupByMonth(enriched);
  const summaries = [...byMonth.entries()].map(([m, list]) =>
    summarizeMonth(m, list),
  );
  return [...summaries].sort((a, b) =>
    a.month < b.month ? -1 : a.month > b.month ? 1 : 0,
  );
}
`,
      description: "topCategory を 「最大の revenue を持つ単一注文のカテゴリ」 として求めてしまっている。 同じカテゴリの注文が複数あるとき、 行単位ではなく カテゴリ別に合計してから比較する必要がある (テスト失敗: fruit 合計 200 > veg 合計 150 のケースで veg を返す)",
    },
    {
      code: `function excludeRefunded(orders) {
  return orders.filter((o) => !o.refunded);
}

function withRevenue(orders) {
  return orders.map((o) => ({
    ...o,
    month: o.date.slice(0, 7),
    revenue: o.qty * o.price,
  }));
}

function groupByMonth(orders) {
  return orders.reduce((map, o) => {
    map.set(o.month, [...(map.get(o.month) ?? []), o]);
    return map;
  }, new Map());
}

function summarizeMonth(month, ordersOfMonth) {
  const totalRevenue = ordersOfMonth.reduce((acc, o) => acc + o.revenue, 0);
  const orderCount = ordersOfMonth.length;
  const byCategory = ordersOfMonth.reduce((map, o) => {
    map.set(o.category, (map.get(o.category) ?? 0) + o.revenue);
    return map;
  }, new Map());
  const topCategory = [...byCategory.entries()].reduce(
    (best, cur) => (best === null || cur[1] > best[1] ? cur : best),
    null,
  )[0];
  return { month, totalRevenue, orderCount, topCategory };
}

function monthlySalesReport(orders) {
  return orders
    .filter((o) => !o.refunded)
    .map((o) => ({ ...o, month: o.date.slice(0, 7), revenue: o.qty * o.price }))
    .reduce((map, o) => {
      map.set(o.month, [...(map.get(o.month) ?? []), o]);
      return map;
    }, new Map());
}
`,
      description: "monthlySalesReport の中でヘルパー関数を呼ばずに filter / map / reduce を直接書き、 さらに Map を返してしまっている (配列を返すべき)。 ヘルパー関数を作った意味が消える S5 設計の典型ミス + 戻り値の型がそもそも間違い (テスト失敗: 戻り値が Map で Array.isArray が false)",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.filter",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/filter",
      pageTitle: "Array.prototype.filter",
    },
    {
      heading: "Array.prototype.map",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/map",
      pageTitle: "Array.prototype.map",
    },
    {
      heading: "Array.prototype.reduce",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce",
      pageTitle: "Array.prototype.reduce",
    },
    {
      heading: "Map.prototype.entries",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Map/entries",
      pageTitle: "Map.prototype.entries",
    },
    {
      heading: "Array.prototype.sort",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/sort",
      pageTitle: "Array.prototype.sort",
    },
  ],
};
