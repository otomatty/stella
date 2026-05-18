import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s5Ch09BuildLeaderboard: Assignment = {
  id: "S5-Ch09-01-build-leaderboard",
  stage: "S5",
  chapterId: "Ch09",
  sequence: 1,
  title: "ランキング生成パイプラインを 4 つの関数に責務分割する",
  newConcept:
    "filter → map → sort → slice の 4 段パイプラインを、 役割の違う複数の名前付き関数に切り出して合成する。 S4 まで 1 関数で書いていた処理を 「段ごとに 1 関数」 に分けて再利用性と読みやすさを上げる設計演習",
  estimatedMinutes: 50,
  difficulty: 2,
  testKind: "function",
  description: `## やること

\`{ name: string, score: number, isActive: boolean }\` のプレイヤー配列から、 アクティブなプレイヤー上位 \`n\` 名のランキングを作る処理を、 **役割の違う 4 つの関数** に分割して実装してください。

- \`onlyActive(players)\` — \`isActive === true\` のプレイヤーだけ残した **新しい配列** を返す (\`filter\`)
- \`toRanking(players)\` — 各プレイヤーを \`{ name, score }\` に射影した **新しい配列** を返す (\`map\`)
- \`takeTop(rankings, n)\` — \`score\` の **降順** に並べて先頭 \`n\` 件を切り出した **新しい配列** を返す (\`sort\` + \`slice\`)
- \`buildLeaderboard(players, n)\` — 上の 3 関数を **関数の合成 (または順に呼び出し)** で組み合わせ、 アクティブな上位 \`n\` 名の \`[{ name, score }, ...]\` を返す

\`\`\`js
const players = [
  { name: "Alice",   score: 90, isActive: true  },
  { name: "Bob",     score: 70, isActive: false },
  { name: "Carol",   score: 85, isActive: true  },
  { name: "Dave",    score: 60, isActive: true  },
  { name: "Eve",     score: 95, isActive: true  },
];

onlyActive(players);
// → [Alice, Carol, Dave, Eve]  (Bob 除外)

toRanking([{ name: "Alice", score: 90, isActive: true }]);
// → [{ name: "Alice", score: 90 }]   (isActive を落とす)

takeTop([{ name: "A", score: 30 }, { name: "B", score: 50 }, { name: "C", score: 40 }], 2);
// → [{ name: "B", score: 50 }, { name: "C", score: 40 }]

buildLeaderboard(players, 3);
// → [
//     { name: "Eve",   score: 95 },
//     { name: "Alice", score: 90 },
//     { name: "Carol", score: 85 },
//   ]
\`\`\`

### 守るべき設計

- **4 関数すべてを \`function\` 宣言で書く**。
- \`buildLeaderboard\` の中で \`filter\` / \`map\` / \`sort\` / \`slice\` を **直接呼ばない**。 必ず上の 3 関数を **呼び出す形** で組み立てる (二重実装を防ぐ)。
- どの関数も **入力配列・入力オブジェクトを書き換えない**。 \`sort\` は元配列を破壊するため、 \`takeTop\` では \`[...rankings].sort(...)\` のように **コピーしてから並べ替える**。
- \`for\` / \`for...of\` / \`while\` / \`forEach\` は使わない。 必ず \`filter\` / \`map\` の高階関数で書く (Ch09 の主題)。

## ポイント

- これは S5 (設計演習) の問題です。 「全部 1 関数で書く」 のではなく、 **データ変換の 1 段 = 1 関数** に切り分けて、 後から他のレポートにも再利用できる形にします。
- \`takeTop\` の中で \`[...rankings]\` の **コピーを忘れる** と、 呼び出し側の \`rankings\` の並び順が破壊されます。 「\`sort\` は元配列を書き換える」 を思い出すこと。
- \`buildLeaderboard\` は \`takeTop(toRanking(onlyActive(players)), n)\` のように **関数の合成** で書けるはずです。 ここで再度 \`filter\` を呼んでしまうと 「関数を分けた意味」 が消えてしまいます。
- \`onlyActive\` を呼んだ結果は **元の配列とは別インスタンス** であるべきです (\`Array.filter\` が新配列を返すのでこの条件は自動的に満たされます)。
`,
  starterFiles: singleFile(`function onlyActive(players) {
  // isActive === true のプレイヤーだけを Array.filter で残す。
}

function toRanking(players) {
  // { name, score, isActive } を { name, score } に Array.map で射影する。
}

function takeTop(rankings, n) {
  // 1) [...rankings] でコピーしてから sort で score 降順に並べ、
  // 2) slice(0, n) で先頭 n 件を返す。
}

function buildLeaderboard(players, n) {
  // 上の 3 関数を順に呼んで合成する。
  // takeTop(toRanking(onlyActive(players)), n) のように書ける。
}
`),
  entryPoints: ["onlyActive", "toRanking", "takeTop", "buildLeaderboard"],
  demoCall: `console.log(buildLeaderboard([
  { name: "Alice", score: 90, isActive: true },
  { name: "Bob",   score: 70, isActive: false },
  { name: "Carol", score: 85, isActive: true },
  { name: "Eve",   score: 95, isActive: true },
], 2));`,
  tests: [
    {
      name: "onlyActive: isActive=true だけ残す",
      code: `(() => {
        const r = onlyActive([
          { name: "A", score: 1, isActive: true },
          { name: "B", score: 2, isActive: false },
          { name: "C", score: 3, isActive: true },
        ]);
        return r.length === 2 && r[0].name === "A" && r[1].name === "C";
      })()`,
    },
    {
      name: "onlyActive: 空配列なら空配列",
      code: `(() => {
        const r = onlyActive([]);
        return Array.isArray(r) && r.length === 0;
      })()`,
    },
    {
      name: "onlyActive: 元の配列を書き換えない",
      code: `(() => {
        const src = [
          { name: "A", score: 1, isActive: true },
          { name: "B", score: 2, isActive: false },
        ];
        const before = JSON.stringify(src);
        onlyActive(src);
        return JSON.stringify(src) === before;
      })()`,
    },
    {
      name: "toRanking: { name, score } だけに射影する",
      code: `(() => {
        const r = toRanking([{ name: "A", score: 90, isActive: true }]);
        return r.length === 1
          && r[0].name === "A"
          && r[0].score === 90
          && !Object.hasOwn(r[0], "isActive");
      })()`,
    },
    {
      name: "toRanking: 件数を保つ",
      code: `toRanking([
        { name: "A", score: 1, isActive: true },
        { name: "B", score: 2, isActive: true },
        { name: "C", score: 3, isActive: false },
      ]).length === 3`,
    },
    {
      name: "takeTop: score 降順で上位 n 件",
      code: `(() => {
        const r = takeTop([
          { name: "A", score: 30 },
          { name: "B", score: 50 },
          { name: "C", score: 40 },
        ], 2);
        return r.length === 2 && r[0].name === "B" && r[1].name === "C";
      })()`,
    },
    {
      name: "takeTop: n が件数より大きいなら全件",
      code: `(() => {
        const r = takeTop([{ name: "A", score: 1 }, { name: "B", score: 2 }], 10);
        return r.length === 2 && r[0].name === "B" && r[1].name === "A";
      })()`,
    },
    {
      name: "takeTop: n = 0 なら空配列",
      code: `(() => {
        const r = takeTop([{ name: "A", score: 1 }], 0);
        return Array.isArray(r) && r.length === 0;
      })()`,
    },
    {
      name: "takeTop: 元の配列の並び順を破壊しない (コピーしてから sort)",
      code: `(() => {
        const src = [
          { name: "A", score: 30 },
          { name: "B", score: 50 },
          { name: "C", score: 40 },
        ];
        takeTop(src, 3);
        return src[0].name === "A" && src[1].name === "B" && src[2].name === "C";
      })()`,
    },
    {
      name: "buildLeaderboard: アクティブな上位 3 名を score 降順で返す",
      code: `(() => {
        const r = buildLeaderboard([
          { name: "Alice", score: 90, isActive: true },
          { name: "Bob",   score: 70, isActive: false },
          { name: "Carol", score: 85, isActive: true },
          { name: "Dave",  score: 60, isActive: true },
          { name: "Eve",   score: 95, isActive: true },
        ], 3);
        return r.length === 3
          && r[0].name === "Eve"   && r[0].score === 95
          && r[1].name === "Alice" && r[1].score === 90
          && r[2].name === "Carol" && r[2].score === 85;
      })()`,
    },
    {
      name: "buildLeaderboard: 戻り値の各要素は { name, score } のみ (isActive を含まない)",
      code: `(() => {
        const r = buildLeaderboard([
          { name: "Eve", score: 95, isActive: true },
        ], 1);
        return r.length === 1
          && r[0].name === "Eve"
          && r[0].score === 95
          && !Object.hasOwn(r[0], "isActive");
      })()`,
    },
    {
      name: "buildLeaderboard: 全員 isActive=false なら空配列",
      code: `(() => {
        const r = buildLeaderboard([
          { name: "A", score: 1, isActive: false },
          { name: "B", score: 2, isActive: false },
        ], 5);
        return Array.isArray(r) && r.length === 0;
      })()`,
    },
    {
      name: "buildLeaderboard: 元の配列を破壊しない (非破壊)",
      code: `(() => {
        const src = [
          { name: "Alice", score: 90, isActive: true },
          { name: "Bob",   score: 70, isActive: false },
          { name: "Carol", score: 85, isActive: true },
        ];
        const before = JSON.stringify(src);
        buildLeaderboard(src, 2);
        return JSON.stringify(src) === before;
      })()`,
    },
    {
      name: "buildLeaderboard: onlyActive / toRanking / takeTop を合成して呼ぶ (二重実装の防止)",
      code: `(() => {
        const _onlyActive = globalThis.onlyActive;
        const _toRanking = globalThis.toRanking;
        const _takeTop = globalThis.takeTop;
        let c1 = 0, c2 = 0, c3 = 0;
        globalThis.onlyActive = (...args) => { c1 += 1; return _onlyActive(...args); };
        globalThis.toRanking = (...args) => { c2 += 1; return _toRanking(...args); };
        globalThis.takeTop = (...args) => { c3 += 1; return _takeTop(...args); };
        try {
          buildLeaderboard([
            { name: "A", score: 1, isActive: true },
            { name: "B", score: 2, isActive: false },
          ], 1);
          return c1 > 0 && c2 > 0 && c3 > 0;
        } finally {
          globalThis.onlyActive = _onlyActive;
          globalThis.toRanking = _toRanking;
          globalThis.takeTop = _takeTop;
        }
      })()`,
    },
  ],
  hints: [
    "onlyActive は players.filter((p) => p.isActive) の 1 行で書けます。 戻り値を return することを忘れずに。",
    "toRanking は players.map((p) => ({ name: p.name, score: p.score })) で射影します。 アロー関数の中でオブジェクトを返すには () で囲むのを忘れないこと。",
    "takeTop は sort が元配列を破壊するので、 [...rankings].sort((a, b) => b.score - a.score).slice(0, n) のようにスプレッドでコピーしてから並べ替えます。",
    "buildLeaderboard は takeTop(toRanking(onlyActive(players)), n) と書くだけ。 ここで自前で filter / map / sort を再度書かないこと (二重実装の防止)。",
    "解答例:\n```js\nfunction onlyActive(players) {\n  return players.filter((p) => p.isActive);\n}\n\nfunction toRanking(players) {\n  return players.map((p) => ({ name: p.name, score: p.score }));\n}\n\nfunction takeTop(rankings, n) {\n  return [...rankings]\n    .sort((a, b) => b.score - a.score)\n    .slice(0, n);\n}\n\nfunction buildLeaderboard(players, n) {\n  return takeTop(toRanking(onlyActive(players)), n);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "FunctionDeclaration", label: "4 関数 (onlyActive / toRanking / takeTop / buildLeaderboard) を function 宣言で書く" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で結果を返す" },
        { kind: "method", name: "filter", label: "onlyActive で Array.filter を使う" },
        { kind: "method", name: "map", label: "toRanking で Array.map を使う" },
        { kind: "method", name: "sort", label: "takeTop で score 降順に Array.sort する" },
        { kind: "method", name: "slice", label: "takeTop で先頭 n 件を Array.slice で切り出す" },
        { kind: "node", nodeType: "SpreadElement", label: "[...rankings] で配列をコピーしてから sort する (元配列の破壊防止)" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
        { kind: "node", nodeType: "ForStatement", label: "高階関数で書くので for は使わない" },
        { kind: "node", nodeType: "ForOfStatement", label: "高階関数で書くので for...of は使わない" },
        { kind: "node", nodeType: "ForInStatement", label: "高階関数で書くので for...in は使わない" },
        { kind: "node", nodeType: "WhileStatement", label: "高階関数で書くので while は使わない" },
        { kind: "node", nodeType: "DoWhileStatement", label: "高階関数で書くので do...while は使わない" },
        { kind: "method", name: "forEach", label: "filter / map で書くので forEach は使わない" },
      ],
    },
  },
  solution: `function onlyActive(players) {
  return players.filter((p) => p.isActive);
}

function toRanking(players) {
  return players.map((p) => ({ name: p.name, score: p.score }));
}

function takeTop(rankings, n) {
  return [...rankings]
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

function buildLeaderboard(players, n) {
  return takeTop(toRanking(onlyActive(players)), n);
}
`,
  badSolutions: [
    {
      code: `function onlyActive(players) {
  return players.filter((p) => p.isActive);
}

function toRanking(players) {
  return players.map((p) => ({ name: p.name, score: p.score }));
}

function takeTop(rankings, n) {
  return rankings.sort((a, b) => b.score - a.score).slice(0, n);
}

function buildLeaderboard(players, n) {
  return takeTop(toRanking(onlyActive(players)), n);
}
`,
      description: "takeTop で [...rankings] のコピーを取らずに sort しているため、 引数として受け取った rankings 配列の並び順を破壊してしまう (SpreadElement が AST required を満たさない / 「takeTop: 元の配列の並び順を破壊しない」 テストが失敗する)",
    },
    {
      code: `function onlyActive(players) {
  return players.filter((p) => p.isActive);
}

function toRanking(players) {
  return players.map((p) => ({ name: p.name, score: p.score }));
}

function takeTop(rankings, n) {
  return [...rankings].sort((a, b) => b.score - a.score).slice(0, n);
}

function buildLeaderboard(players, n) {
  return takeTop(toRanking(players), n);
}
`,
      description: "buildLeaderboard で onlyActive を呼び忘れており、 非アクティブなプレイヤーが除外されない (テスト失敗: 「アクティブな上位 3 名を score 降順で返す」 で除外されるはずの Bob が混入する)",
    },
    {
      code: `function onlyActive(players) {
  const result = [];
  for (const p of players) {
    if (p.isActive) {
      result.push(p);
    }
  }
  return result;
}

function toRanking(players) {
  const result = [];
  for (const p of players) {
    result.push({ name: p.name, score: p.score });
  }
  return result;
}

function takeTop(rankings, n) {
  return [...rankings].sort((a, b) => b.score - a.score).slice(0, n);
}

function buildLeaderboard(players, n) {
  return takeTop(toRanking(onlyActive(players)), n);
}
`,
      description: "onlyActive / toRanking を for...of + push で書いており、 Ch09 主題の filter / map を使っていない (AST forbidden: ForOfStatement、 AST required: filter / map が未充足)",
    },
    {
      code: `function onlyActive(players) {
  return players.filter((p) => p.isActive);
}

function toRanking(players) {
  return players.map((p) => ({ name: p.name, score: p.score }));
}

function takeTop(rankings, n) {
  return [...rankings].sort((a, b) => a.score - b.score).slice(0, n);
}

function buildLeaderboard(players, n) {
  return takeTop(toRanking(onlyActive(players)), n);
}
`,
      description: "takeTop の比較関数を昇順 (a.score - b.score) にしてしまい、 上位 n 件のはずが下位 n 件を返している (テスト失敗: 期待される降順順序にならない)",
    },
    {
      code: `function onlyActive(players) {
  return players.filter((p) => p.isActive);
}

function toRanking(players) {
  return players.map((p) => ({ name: p.name, score: p.score }));
}

function takeTop(rankings, n) {
  return [...rankings].sort((a, b) => b.score - a.score).slice(0, n);
}

function buildLeaderboard(players, n) {
  return [...players]
    .filter((p) => p.isActive)
    .map((p) => ({ name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
`,
      description: "buildLeaderboard の中で onlyActive / toRanking / takeTop を呼ばずに filter / map / sort / slice を直接書いている。 ヘルパー関数を作った意味が消え、 ロジックが二重実装になっている (テスト失敗: 「onlyActive / toRanking / takeTop を合成して呼ぶ」 のスパイ検証で c1 / c2 / c3 が 0 のまま)",
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
      heading: "Array.prototype.sort",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/sort",
      pageTitle: "Array.prototype.sort",
    },
    {
      heading: "スプレッド構文",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Spread_syntax",
      pageTitle: "スプレッド構文",
    },
  ],
};
