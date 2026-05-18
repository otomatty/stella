import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s5Ch09PipeReports: Assignment = {
  id: "S5-Ch09-02-pipe-reports",
  stage: "S5",
  chapterId: "Ch09",
  sequence: 2,
  title: "pipe で関数合成を実装し、 同じ部品で複数のレポートを組み立てる",
  newConcept:
    "関数を引数として受け取り、 順に適用する \`pipe\` を自作する。 \`filter\` / \`map\` / \`reduce\` を「1 段 1 関数」 のステップに切り出して、 同じ部品の異なる組み合わせから 2 種類のレポートを生成する。 高階関数を 「受け取る・返す」 両面で扱う設計演習",
  estimatedMinutes: 65,
  difficulty: 3,
  testKind: "function",
  description: `## やること

注文配列 \`[{ price: number, qty: number, isPaid: boolean }]\` から **複数のレポート** を作るために、 「データ変換ステップ」 を **小さな純粋関数** に分け、 関数合成ユーティリティ \`pipe\` で組み合わせる設計を行います。

### 実装する関数

- \`pipe(...fns)\` — **関数を 0 個以上受け取り**、 「最初の関数に値を渡し、 戻り値を次の関数に渡し…」 を順に適用する **新しい関数** を返す。 関数を 1 つも受け取らなければ恒等関数 (\`(x) => x\`) を返す。
- \`paidOnly(orders)\` — \`isPaid === true\` の注文だけ残す (\`filter\`)
- \`withLineTotal(orders)\` — 各注文を \`{ price, qty, isPaid, lineTotal }\` に拡張する (\`map\`、 \`lineTotal = price * qty\`)
- \`sumLineTotals(orders)\` — \`lineTotal\` の合計を返す (\`reduce\`、 初期値 \`0\`)
- \`paidRevenue\` — \`pipe(paidOnly, withLineTotal, sumLineTotals)\` で合成された **関数** (関数を export する)
- \`paidOrderCount\` — \`pipe(paidOnly, (orders) => orders.length)\` で合成された **関数**

\`\`\`js
const orders = [
  { price: 100, qty: 2, isPaid: true  },   // lineTotal 200
  { price: 50,  qty: 3, isPaid: false },   // 除外
  { price: 200, qty: 1, isPaid: true  },   // lineTotal 200
];

paidOnly(orders).length;            // → 2
withLineTotal(orders)[0].lineTotal; // → 200
sumLineTotals([{ lineTotal: 200 }, { lineTotal: 200 }]); // → 400

paidRevenue(orders);     // → 400
paidOrderCount(orders);  // → 2

pipe()(42);                              // → 42 (関数なしは恒等関数)
pipe((x) => x + 1, (x) => x * 2)(3);     // → (3 + 1) * 2 = 8
\`\`\`

### 守るべき設計

- \`pipe\` は **可変長引数** (\`...fns\`) で受け取り、 内部で **\`reduce\`** を使って関数を畳み込む形で実装する (\`fns.reduce((acc, fn) => fn(acc), x)\`)。
- \`paidRevenue\` / \`paidOrderCount\` は \`function\` 宣言ではなく、 \`pipe\` 呼び出しの結果である **関数を const に代入して export する** 形 (= 高階関数が返した関数をそのまま使う) で書く。
- どの関数も入力配列・入力オブジェクトを **書き換えない**。 \`withLineTotal\` は \`{ ...order, lineTotal: ... }\` のように **スプレッドで新オブジェクト** を作る。
- \`for\` / \`for...of\` / \`while\` / \`forEach\` は使わない。 必ず \`filter\` / \`map\` / \`reduce\` で書く。

## ポイント

- これは S5 (設計演習) の問題です。 「1 つの大関数で全部やる」 のではなく、 **データ変換のステップごとに関数を切り出して、 \`pipe\` で繋ぐ** という関数型のスタイルを練習します。
- \`pipe\` は **「高階関数を受け取り、 高階関数を返す」 関数** の典型例。 中身は \`fns.reduce((acc, fn) => fn(acc), x)\` のような 1 行に収まりますが、 これが書けると 「\`paidRevenue\`」 「\`paidOrderCount\`」 のように **同じ部品から複数のパイプラインを派生** できます。
- \`paidRevenue = pipe(paidOnly, withLineTotal, sumLineTotals)\` のように **関数を const に代入する** スタイルでは、 \`paidRevenue(orders)\` と呼ぶたびに \`pipe\` 内部の \`reduce\` が実行されます。 \`pipe\` の戻り値は **関数** であり、 数値ではないことに注意。
- \`withLineTotal\` が **新しいオブジェクトを返す** (元を破壊しない) ことで、 \`paidRevenue\` を 2 回呼んでも同じ結果になります。 これが純粋関数の利点 (テストしやすさ・並列化しやすさ)。
- AST で \`filter\` / \`map\` / \`reduce\` の **3 つすべて** を必須にしているので、 \`for\` ループでは通りません。
`,
  starterFiles: singleFile(`function pipe(...fns) {
  // 関数を 0 個以上受け取り、 新しい関数を返す。
  // 戻り値の関数は、 初期値 x に対して fns を 順に適用した結果を返す。
  // ヒント: return (x) => fns.reduce((acc, fn) => fn(acc), x);
}

function paidOnly(orders) {
  // isPaid === true の注文だけを Array.filter で残す。
}

function withLineTotal(orders) {
  // 各注文を { ...order, lineTotal: price * qty } に Array.map で拡張する。
}

function sumLineTotals(orders) {
  // lineTotal を Array.reduce で合計する (初期値 0)。
}

// pipe を使って 2 つのパイプラインを合成する。 const で関数を保持して使う。
const paidRevenue = pipe(paidOnly, withLineTotal, sumLineTotals);
const paidOrderCount = pipe(paidOnly, (orders) => orders.length);
`),
  entryPoints: [
    "pipe",
    "paidOnly",
    "withLineTotal",
    "sumLineTotals",
    "paidRevenue",
    "paidOrderCount",
  ],
  demoCall: `console.log(paidRevenue([
  { price: 100, qty: 2, isPaid: true },
  { price: 50,  qty: 3, isPaid: false },
  { price: 200, qty: 1, isPaid: true },
]));`,
  tests: [
    {
      name: "pipe: 関数なしの呼び出しは恒等関数として動く",
      code: `pipe()(42) === 42`,
    },
    {
      name: "pipe: 関数 1 つなら その関数の結果と等しい",
      code: `pipe((x) => x + 10)(5) === 15`,
    },
    {
      name: "pipe: 関数を左から順に適用する",
      code: `pipe((x) => x + 1, (x) => x * 2)(3) === 8`,
    },
    {
      name: "pipe: 関数 3 つの合成",
      code: `pipe((x) => x + 1, (x) => x * 2, (x) => x - 3)(4) === ((4 + 1) * 2) - 3`,
    },
    {
      name: "pipe: 戻り値は関数 (= 呼び出さない限り評価されない)",
      code: `typeof pipe((x) => x + 1) === "function"`,
    },
    {
      name: "paidOnly: isPaid=true だけ残す",
      code: `(() => {
        const r = paidOnly([
          { price: 1, qty: 1, isPaid: true },
          { price: 2, qty: 1, isPaid: false },
          { price: 3, qty: 1, isPaid: true },
        ]);
        return r.length === 2 && r[0].price === 1 && r[1].price === 3;
      })()`,
    },
    {
      name: "withLineTotal: lineTotal = price * qty を足したオブジェクトを返す",
      code: `(() => {
        const r = withLineTotal([{ price: 100, qty: 3, isPaid: true }]);
        return r.length === 1
          && r[0].lineTotal === 300
          && r[0].price === 100
          && r[0].qty === 3
          && r[0].isPaid === true;
      })()`,
    },
    {
      name: "withLineTotal: 元のオブジェクトを書き換えない (非破壊)",
      code: `(() => {
        const src = { price: 100, qty: 2, isPaid: true };
        withLineTotal([src]);
        return !Object.hasOwn(src, "lineTotal");
      })()`,
    },
    {
      name: "sumLineTotals: lineTotal の合計を返す",
      code: `sumLineTotals([
        { lineTotal: 100 },
        { lineTotal: 200 },
        { lineTotal: 50 },
      ]) === 350`,
    },
    {
      name: "sumLineTotals: 空配列なら 0",
      code: `sumLineTotals([]) === 0`,
    },
    {
      name: "paidRevenue: pipe で合成された関数が支払済の合計金額を返す",
      code: `paidRevenue([
        { price: 100, qty: 2, isPaid: true },
        { price: 50,  qty: 3, isPaid: false },
        { price: 200, qty: 1, isPaid: true },
      ]) === 400`,
    },
    {
      name: "paidRevenue: 支払済が無ければ 0",
      code: `paidRevenue([
        { price: 100, qty: 1, isPaid: false },
        { price: 200, qty: 1, isPaid: false },
      ]) === 0`,
    },
    {
      name: "paidRevenue: 空配列で 0",
      code: `paidRevenue([]) === 0`,
    },
    {
      name: "paidOrderCount: 支払済の件数を返す",
      code: `paidOrderCount([
        { price: 1, qty: 1, isPaid: true },
        { price: 2, qty: 1, isPaid: false },
        { price: 3, qty: 1, isPaid: true },
      ]) === 2`,
    },
    {
      name: "paidOrderCount: 全件未払いなら 0",
      code: `paidOrderCount([
        { price: 1, qty: 1, isPaid: false },
        { price: 2, qty: 1, isPaid: false },
      ]) === 0`,
    },
    {
      name: "paidRevenue / paidOrderCount は関数 (pipe の戻り値)",
      code: `typeof paidRevenue === "function" && typeof paidOrderCount === "function"`,
    },
    {
      name: "paidRevenue は同じ入力で何度呼んでも同じ結果 (純粋性)",
      code: `(() => {
        const orders = [
          { price: 100, qty: 2, isPaid: true },
          { price: 200, qty: 1, isPaid: true },
        ];
        return paidRevenue(orders) === paidRevenue(orders);
      })()`,
    },
    {
      name: "paidRevenue は元の orders を破壊しない",
      code: `(() => {
        const src = [
          { price: 100, qty: 2, isPaid: true },
          { price: 50,  qty: 3, isPaid: false },
        ];
        const before = JSON.stringify(src);
        paidRevenue(src);
        return JSON.stringify(src) === before;
      })()`,
    },
  ],
  hints: [
    "pipe の中身は return (x) => fns.reduce((acc, fn) => fn(acc), x); の 1 行で書けます。 fns が空配列でも reduce は初期値 x をそのまま返すので、 恒等関数として自然に動きます。",
    "paidOnly は orders.filter((o) => o.isPaid)、 withLineTotal は orders.map((o) => ({ ...o, lineTotal: o.price * o.qty }))、 sumLineTotals は orders.reduce((acc, o) => acc + o.lineTotal, 0) です。 どれも 1 行に収まります。",
    "paidRevenue / paidOrderCount は function 宣言ではなく、 const paidRevenue = pipe(...) のように pipe の戻り値 (関数) を const に保持します。 paidRevenue は呼び出して初めて評価されるので、 「関数を作る」 と 「関数を呼ぶ」 を区別すること。",
    "解答例:\n```js\nfunction pipe(...fns) {\n  return (x) => fns.reduce((acc, fn) => fn(acc), x);\n}\n\nfunction paidOnly(orders) {\n  return orders.filter((o) => o.isPaid);\n}\n\nfunction withLineTotal(orders) {\n  return orders.map((o) => ({ ...o, lineTotal: o.price * o.qty }));\n}\n\nfunction sumLineTotals(orders) {\n  return orders.reduce((acc, o) => acc + o.lineTotal, 0);\n}\n\nconst paidRevenue = pipe(paidOnly, withLineTotal, sumLineTotals);\nconst paidOrderCount = pipe(paidOnly, (orders) => orders.length);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "FunctionDeclaration", label: "pipe / paidOnly / withLineTotal / sumLineTotals を function 宣言で書く" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で結果を返す" },
        { kind: "node", nodeType: "RestElement", label: "pipe(...fns) の Rest パラメータで可変長引数を受け取る" },
        { kind: "method", name: "filter", label: "paidOnly で Array.filter を使う" },
        { kind: "method", name: "map", label: "withLineTotal で Array.map を使う" },
        { kind: "method", name: "reduce", label: "sumLineTotals / pipe で Array.reduce を使う" },
        { kind: "node", nodeType: "SpreadElement", label: "withLineTotal で { ...order, lineTotal } のように スプレッドで新オブジェクトを作る" },
        { kind: "const-declaration", name: "paidRevenue", label: "const paidRevenue = pipe(...) で合成結果を保持する" },
        { kind: "const-declaration", name: "paidOrderCount", label: "const paidOrderCount = pipe(...) で合成結果を保持する" },
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
  solution: `function pipe(...fns) {
  return (x) => fns.reduce((acc, fn) => fn(acc), x);
}

function paidOnly(orders) {
  return orders.filter((o) => o.isPaid);
}

function withLineTotal(orders) {
  return orders.map((o) => ({ ...o, lineTotal: o.price * o.qty }));
}

function sumLineTotals(orders) {
  return orders.reduce((acc, o) => acc + o.lineTotal, 0);
}

const paidRevenue = pipe(paidOnly, withLineTotal, sumLineTotals);
const paidOrderCount = pipe(paidOnly, (orders) => orders.length);
`,
  badSolutions: [
    {
      code: `function pipe(...fns) {
  return (x) => {
    let acc = x;
    for (const fn of fns) {
      acc = fn(acc);
    }
    return acc;
  };
}

function paidOnly(orders) {
  return orders.filter((o) => o.isPaid);
}

function withLineTotal(orders) {
  return orders.map((o) => ({ ...o, lineTotal: o.price * o.qty }));
}

function sumLineTotals(orders) {
  return orders.reduce((acc, o) => acc + o.lineTotal, 0);
}

const paidRevenue = pipe(paidOnly, withLineTotal, sumLineTotals);
const paidOrderCount = pipe(paidOnly, (orders) => orders.length);
`,
      description: "pipe を for...of で実装している。 Ch09 主題の reduce で関数を畳み込む書き方を練習するのが目的なので、 AST forbidden (ForOfStatement) に違反する",
    },
    {
      code: `function pipe(...fns) {
  return (x) => fns.reduce((acc, fn) => fn(acc), x);
}

function paidOnly(orders) {
  return orders.filter((o) => o.isPaid);
}

function withLineTotal(orders) {
  return orders.map((o) => {
    o.lineTotal = o.price * o.qty;
    return o;
  });
}

function sumLineTotals(orders) {
  return orders.reduce((acc, o) => acc + o.lineTotal, 0);
}

const paidRevenue = pipe(paidOnly, withLineTotal, sumLineTotals);
const paidOrderCount = pipe(paidOnly, (orders) => orders.length);
`,
      description: "withLineTotal が 元のオブジェクトに lineTotal を直接代入していて非破壊にならない (テスト失敗: 「元のオブジェクトを書き換えない」 / SpreadElement が AST required で未充足)",
    },
    {
      code: `function pipe(...fns) {
  return (x) => fns.reduce((acc, fn) => fn(acc), x);
}

function paidOnly(orders) {
  return orders.filter((o) => o.isPaid);
}

function withLineTotal(orders) {
  return orders.map((o) => ({ ...o, lineTotal: o.price * o.qty }));
}

function sumLineTotals(orders) {
  return orders.reduce((acc, o) => acc + o.lineTotal, 0);
}

function paidRevenue(orders) {
  return sumLineTotals(withLineTotal(paidOnly(orders)));
}

function paidOrderCount(orders) {
  return paidOnly(orders).length;
}
`,
      description: "paidRevenue / paidOrderCount を pipe で合成せず、 function 宣言として直接書いている。 pipe を作ったのに使わない設計になっており、 「同じ部品の異なる組み合わせから複数のパイプラインを派生する」 という S5 の主題に反する (const-declaration の AST required: paidRevenue / paidOrderCount が未充足)",
    },
    {
      code: `function pipe(...fns) {
  return (x) => fns.reduce((acc, fn) => fn(acc), x);
}

function paidOnly(orders) {
  return orders.filter((o) => o.isPaid);
}

function withLineTotal(orders) {
  return orders.map((o) => ({ ...o, lineTotal: o.price + o.qty }));
}

function sumLineTotals(orders) {
  return orders.reduce((acc, o) => acc + o.lineTotal, 0);
}

const paidRevenue = pipe(paidOnly, withLineTotal, sumLineTotals);
const paidOrderCount = pipe(paidOnly, (orders) => orders.length);
`,
      description: "withLineTotal が price * qty ではなく price + qty を計算してしまっている (テスト失敗: paidRevenue の期待値 400 にならない)",
    },
  ],
  mdnSections: [
    {
      heading: "残余引数 (...rest)",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Functions/rest_parameters",
      pageTitle: "残余引数",
    },
    {
      heading: "Array.prototype.reduce",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce",
      pageTitle: "Array.prototype.reduce",
    },
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
  ],
};
