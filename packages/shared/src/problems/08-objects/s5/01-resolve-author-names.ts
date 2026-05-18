import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s5Ch08ResolveAuthorNames: Assignment = {
  id: "S5-Ch08-01-resolve-author-names",
  stage: "S5",
  chapterId: "Ch08",
  sequence: 1,
  title: "投稿に著者名を解決する (主従関係の参照解決を 2 関数に分割)",
  newConcept:
    "users の配列を 「id → name」 のルックアップオブジェクトに変換するヘルパー関数を切り出し、 メイン関数からそれを呼んで posts と users の主従関係を解決する。 関数分割 + 非破壊更新 (スプレッド) の設計演習",
  estimatedMinutes: 50,
  difficulty: 2,
  testKind: "function",
  description: `## やること

ブログの投稿一覧 \`posts\` と ユーザー一覧 \`users\` を別々の配列で受け取り、 各 post に **著者名を埋め込んだ新しい配列** を返す処理を、 **2 つの関数に分割** して実装してください。

### 入力の形

\`\`\`js
const users = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
];

const posts = [
  { id: 10, title: "Hello",   authorId: 1 },
  { id: 11, title: "Goodbye", authorId: 2 },
  { id: 12, title: "Orphan",  authorId: 99 },  // users に居ない
];
\`\`\`

### 実装する 2 関数

- \`buildUserIndex(users)\` — \`users\` を **\`{ [id]: name }\` 形式のルックアップオブジェクト** に変換して返す純粋関数。 上の例では \`{ 1: "Alice", 2: "Bob" }\` を返す。
- \`resolvePostAuthors(posts, users)\` — **内部で \`buildUserIndex(users)\` を呼んで** ルックアップを作り、 各 post に対して \`{ id, title, author }\` の **新しいオブジェクト** を作って配列で返す。 author が見つからなければ \`"Unknown"\`。

\`\`\`js
resolvePostAuthors(posts, users);
// → [
//   { id: 10, title: "Hello",   author: "Alice" },
//   { id: 11, title: "Goodbye", author: "Bob" },
//   { id: 12, title: "Orphan",  author: "Unknown" },
// ]
\`\`\`

### 守るべき制約

- 元の \`posts\` / \`users\` 配列、 およびその中のオブジェクトを **書き換えない** (非破壊)。 戻り値は **新しい配列・新しい post オブジェクト**。
- 著者の検索を **post ごとに users を毎回 \`for\` で線形検索** するのは NG。 \`buildUserIndex\` を 1 回だけ呼んで使い回す。 これが「分割」の意味。
- \`map\` / \`filter\` / \`reduce\` は使わない (Ch09 で導入予定)。 \`for...of\` を使う。

## ポイント

- これは S5 (設計演習) の初回です。 1 つの巨大関数に押し込まずに、 **「データ変換」 (buildUserIndex) と 「結合処理」 (resolvePostAuthors) に責務を分ける** 練習をします。
- \`buildUserIndex\` の戻り値は **プレーンオブジェクト**。 \`Map\` ではありません (\`Map\` は Ch10 で導入)。 ブラケット記法 \`index[user.id] = user.name\` でキーに数値を入れると、 JavaScript は内部で文字列キーに変換しますが、 同じ id でアクセスすれば取り出せます。
- \`Object.hasOwn(index, key)\` で「キーが存在するか」を判定すると、 値が \`undefined\` でも安全に区別できます。 ここでは \`name\` が \`undefined\` の users は想定しないため、 \`index[post.authorId]\` の真偽でも判定できますが、 推奨は \`Object.hasOwn\` (S3 で学習済み)。
- 新しい post を作るときは **スプレッド** \`{ ...post, author }\` で書くと、 元の post が将来 \`description\` などのフィールドを増やしても勝手に引き継げて壊れにくい。 これも設計判断のひとつ。
`,
  starterFiles: singleFile(`function buildUserIndex(users) {
  // users を { [id]: name } のオブジェクトに変換して返す。
  // const index = {};
  // for...of で users を 1 周し、 index[user.id] = user.name を入れる。
  // ループを抜けたら index を return する。
}

function resolvePostAuthors(posts, users) {
  // 1) buildUserIndex(users) を呼んでルックアップを作る (1 回だけ)。
  // 2) 結果用の空配列を用意する。
  // 3) for...of で posts を 1 周し、
  //    Object.hasOwn(index, post.authorId) なら author = index[post.authorId]、
  //    そうでなければ author = "Unknown"。
  //    { ...post, author } を結果配列に push する。
  // 4) 結果配列を return する。
}
`),
  entryPoints: ["buildUserIndex", "resolvePostAuthors"],
  demoCall: `console.log(resolvePostAuthors(
  [{ id: 10, title: "Hello", authorId: 1 }],
  [{ id: 1, name: "Alice" }],
));`,
  tests: [
    {
      name: "buildUserIndex: 単純な id → name オブジェクトを作る",
      code: `(() => {
        const idx = buildUserIndex([
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ]);
        return idx[1] === "Alice" && idx[2] === "Bob" && Object.keys(idx).length === 2;
      })()`,
    },
    {
      name: "buildUserIndex: 空配列を渡したら空オブジェクト",
      code: `(() => {
        const idx = buildUserIndex([]);
        return idx !== null && typeof idx === "object" && !Array.isArray(idx) && Object.keys(idx).length === 0;
      })()`,
    },
    {
      name: "buildUserIndex: 戻り値は プレーンオブジェクト (Map ではない)",
      code: `(() => {
        const idx = buildUserIndex([{ id: 1, name: "A" }]);
        return !(idx instanceof Map) && idx !== null && typeof idx === "object" && !Array.isArray(idx);
      })()`,
    },
    {
      name: "resolvePostAuthors: posts に author 名を埋める",
      code: `(() => {
        const r = resolvePostAuthors(
          [
            { id: 10, title: "Hello",   authorId: 1 },
            { id: 11, title: "Goodbye", authorId: 2 },
          ],
          [
            { id: 1, name: "Alice" },
            { id: 2, name: "Bob" },
          ],
        );
        return Array.isArray(r)
          && r.length === 2
          && r[0].author === "Alice" && r[0].title === "Hello" && r[0].id === 10
          && r[1].author === "Bob"   && r[1].title === "Goodbye" && r[1].id === 11;
      })()`,
    },
    {
      name: "resolvePostAuthors: users に居ない authorId は 'Unknown'",
      code: `(() => {
        const r = resolvePostAuthors(
          [{ id: 1, title: "Orphan", authorId: 99 }],
          [{ id: 1, name: "Alice" }],
        );
        return r.length === 1 && r[0].author === "Unknown";
      })()`,
    },
    {
      name: "resolvePostAuthors: posts の登場順を保つ",
      code: `(() => {
        const r = resolvePostAuthors(
          [
            { id: 3, title: "C", authorId: 1 },
            { id: 1, title: "A", authorId: 1 },
            { id: 2, title: "B", authorId: 1 },
          ],
          [{ id: 1, name: "X" }],
        );
        return r[0].id === 3 && r[1].id === 1 && r[2].id === 2;
      })()`,
    },
    {
      name: "resolvePostAuthors: 元の posts 配列を破壊しない",
      code: `(() => {
        const posts = [{ id: 1, title: "A", authorId: 1 }];
        const before = JSON.stringify(posts);
        resolvePostAuthors(posts, [{ id: 1, name: "X" }]);
        return JSON.stringify(posts) === before;
      })()`,
    },
    {
      name: "resolvePostAuthors: 元の users 配列を破壊しない",
      code: `(() => {
        const users = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
        const before = JSON.stringify(users);
        resolvePostAuthors([{ id: 10, title: "Hello", authorId: 1 }], users);
        return JSON.stringify(users) === before;
      })()`,
    },
    {
      name: "resolvePostAuthors: 元の post オブジェクトを破壊しない (author を直接生やさない)",
      code: `(() => {
        const post = { id: 1, title: "A", authorId: 1 };
        resolvePostAuthors([post], [{ id: 1, name: "X" }]);
        return !Object.hasOwn(post, "author");
      })()`,
    },
    {
      name: "resolvePostAuthors: 戻り値の post は 元の post とは別オブジェクト",
      code: `(() => {
        const post = { id: 1, title: "A", authorId: 1 };
        const r = resolvePostAuthors([post], [{ id: 1, name: "X" }]);
        return r[0] !== post && r[0].id === 1 && r[0].title === "A";
      })()`,
    },
    {
      name: "resolvePostAuthors: 空 posts なら空配列",
      code: `(() => {
        const r = resolvePostAuthors([], [{ id: 1, name: "X" }]);
        return Array.isArray(r) && r.length === 0;
      })()`,
    },
    {
      name: "resolvePostAuthors: 空 users でも 全 post が 'Unknown' になる",
      code: `(() => {
        const r = resolvePostAuthors(
          [{ id: 1, title: "A", authorId: 1 }, { id: 2, title: "B", authorId: 2 }],
          [],
        );
        return r.length === 2 && r[0].author === "Unknown" && r[1].author === "Unknown";
      })()`,
    },
    {
      name: "resolvePostAuthors: post の他のフィールド (たとえば createdAt) もスプレッドで引き継がれる",
      code: `(() => {
        const r = resolvePostAuthors(
          [{ id: 1, title: "A", authorId: 1, createdAt: "2024-01-01" }],
          [{ id: 1, name: "X" }],
        );
        return r[0].createdAt === "2024-01-01" && r[0].author === "X";
      })()`,
    },
  ],
  hints: [
    "buildUserIndex は const index = {}; for (const user of users) { index[user.id] = user.name; } return index; の 4 行だけ。",
    "resolvePostAuthors は最初に const index = buildUserIndex(users); で 1 回だけインデックスを作り、 そのあと posts を for...of で 1 周します。 各 post に対して { ...post, author: ... } を作って結果配列に push します。",
    "解答例:\n```js\nfunction buildUserIndex(users) {\n  const index = {};\n  for (const user of users) {\n    index[user.id] = user.name;\n  }\n  return index;\n}\n\nfunction resolvePostAuthors(posts, users) {\n  const index = buildUserIndex(users);\n  const result = [];\n  for (const post of posts) {\n    const author = Object.hasOwn(index, post.authorId) ? index[post.authorId] : \"Unknown\";\n    result.push({ ...post, author });\n  }\n  return result;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "FunctionDeclaration", label: "function buildUserIndex / function resolvePostAuthors を function 宣言で書く" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で結果を返す" },
        { kind: "node", nodeType: "ForOfStatement", label: "for...of でユーザーと投稿を走査する" },
        { kind: "node", nodeType: "SpreadElement", label: "{ ...post, author } のように スプレッドで新しい post オブジェクトを作る" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
        { kind: "method", name: "map", label: "S5-Ch08 では map を使わない (Ch09 で導入)" },
        { kind: "method", name: "filter", label: "S5-Ch08 では filter を使わない (Ch09 で導入)" },
        { kind: "method", name: "reduce", label: "S5-Ch08 では reduce を使わない (Ch09 で導入)" },
      ],
    },
  },
  solution: `function buildUserIndex(users) {
  const index = {};
  for (const user of users) {
    index[user.id] = user.name;
  }
  return index;
}

function resolvePostAuthors(posts, users) {
  const index = buildUserIndex(users);
  const result = [];
  for (const post of posts) {
    const author = Object.hasOwn(index, post.authorId) ? index[post.authorId] : "Unknown";
    result.push({ ...post, author });
  }
  return result;
}
`,
  badSolutions: [
    {
      code: `function buildUserIndex(users) {
  const index = {};
  for (const user of users) {
    index[user.id] = user.name;
  }
  return index;
}

function resolvePostAuthors(posts, users) {
  return posts.map((post) => {
    const index = buildUserIndex(users);
    const author = index[post.authorId] ?? "Unknown";
    return { ...post, author };
  });
}
`,
      description: "map で書いてしまっている (AST forbidden 違反)。 さらに post 1 件ごとに buildUserIndex を再構築しており、 「ヘルパー関数を 1 回だけ呼んで使い回す」 という設計意図にも反する",
    },
    {
      code: `function buildUserIndex(users) {
  const index = {};
  for (const user of users) {
    index[user.id] = user.name;
  }
  return index;
}

function resolvePostAuthors(posts, users) {
  const index = buildUserIndex(users);
  const result = [];
  for (const post of posts) {
    post.author = index[post.authorId] || "Unknown";
    result.push(post);
  }
  return result;
}
`,
      description: "元の post オブジェクトに直接 author プロパティを生やしてミューテーションしている (非破壊テスト失敗)",
    },
    {
      code: `function buildUserIndex(users) {
  const index = {};
  for (const user of users) {
    index[user.id] = user.name;
  }
  return index;
}

function resolvePostAuthors(posts, users) {
  const index = buildUserIndex(users);
  const result = [];
  for (const post of posts) {
    const author = index[post.authorId];
    result.push({ ...post, author });
  }
  return result;
}
`,
      description: "users に居ない authorId のときに author が undefined になり 'Unknown' フォールバックを忘れている (テスト失敗)",
    },
    {
      code: `function buildUserIndex(users) {
  const index = new Map();
  for (const user of users) {
    index.set(user.id, user.name);
  }
  return index;
}

function resolvePostAuthors(posts, users) {
  const index = buildUserIndex(users);
  const result = [];
  for (const post of posts) {
    const author = index.has(post.authorId) ? index.get(post.authorId) : "Unknown";
    result.push({ ...post, author });
  }
  return result;
}
`,
      description: "buildUserIndex が Map を返している (Ch10 で導入予定、 ここではプレーンオブジェクトを期待)。 buildUserIndex 単体の戻り値テストで失敗する",
    },
  ],
  mdnSections: [
    {
      heading: "ブラケット記法",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Property_accessors#bracket_notation",
      pageTitle: "プロパティアクセサー",
    },
    {
      heading: "スプレッド構文",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Spread_syntax",
      pageTitle: "スプレッド構文",
    },
    {
      heading: "Object.hasOwn",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn",
      pageTitle: "Object.hasOwn",
    },
    {
      heading: "for...of",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for...of",
      pageTitle: "for...of",
    },
  ],
};
