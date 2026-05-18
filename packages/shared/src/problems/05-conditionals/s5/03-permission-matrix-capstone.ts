import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s5Ch05PermissionMatrixCapstone: Assignment = {
  id: "S5-Ch05-03-permission-matrix-capstone",
  stage: "S5",
  chapterId: "Ch05",
  sequence: 3,
  title: "[卒業課題] 権限マトリクスから操作可否を判定する",
  newConcept:
    "長い if/switch 連鎖を 「データ + ルックアップ + 配列メソッド」 に置き換えるデータ駆動分岐。 さらにロール継承の連鎖をループで辿る、 拒否理由を区別したリッチな戻り値を返すなど、 S5 までの設計テクニックを統合する卒業課題",
  estimatedMinutes: 80,
  difficulty: 3,
  testKind: "function",
  isCapstone: true,
  description: `## やること

ロール (\`role\`) と リソース (\`resource\`) と 操作 (\`action\`) を受け取り、 **その操作が許可されているか** を判定する関数 \`canPerformAction\` を実装してください。

戻り値は \`{ allowed: boolean, reason: string }\` 形式のオブジェクトで、 判定理由を **5 種類** に区別します (許可 1 種類 + 拒否 4 種類):

- \`"ok"\` — 許可
- \`"invalid-input"\` — 入力が文字列でない、 または空文字
- \`"unknown-role"\` — マトリクスに登録のないロール
- \`"unknown-resource"\` — そのロール (と継承元) でリソースが定義されていない
- \`"action-not-allowed"\` — リソースは存在するが、 許可リストに含まれない

### 権限マトリクス (モジュール先頭に定数で定義)

\`\`\`js
const PERMISSIONS = {
  admin:  { inherits: "editor", users: ["*"] },
  editor: { inherits: "viewer", posts: ["read", "write", "delete"], comments: ["read", "write"] },
  viewer: { posts: ["read"], comments: ["read"] },
  guest:  { posts: ["read"] },
};
\`\`\`

各ロールエントリは以下のルールに従います:

- \`inherits\` — 親ロールの ID。 該当ロールに対象 \`resource\` の定義が無ければ、 親ロールへ辿って探す
- \`inherits\` キーは予約。 \`resource\` 名としては扱わない
- \`<resource>: [<action>, ...]\` — 許可される action の配列。 \`"*"\` ワイルドカードを含むときは **任意の action** を許可

### 判定ルール

1. **入力検証**: \`role\` / \`resource\` / \`action\` のいずれかが文字列でないか空文字なら \`{ allowed: false, reason: "invalid-input" }\`
2. **ロール解決**: \`PERMISSIONS\` に \`role\` が **固有プロパティとして登録されていなければ** \`{ allowed: false, reason: "unknown-role" }\` (\`role = "__proto__"\` のようなプロトタイプ連鎖の値は拾わないこと)
3. **継承の連鎖を辿りながらリソース検索**: ロールエントリで対象 \`resource\` の配列を探す。 見つかった時点で確定。 見つからなければ \`inherits\` を辿って親ロールへ。 ループ防止のため上限回数 (5 回程度) で打ち切り
4. **リソースが見つからない**: \`{ allowed: false, reason: "unknown-resource" }\`
5. **ワイルドカード判定**: 許可リストが \`"*"\` を含むなら \`{ allowed: true, reason: "ok" }\`
6. **action 含有判定**: 許可リストが \`action\` を **\`.includes()\`** で含むなら \`{ allowed: true, reason: "ok" }\`
7. **どれにも該当しない**: \`{ allowed: false, reason: "action-not-allowed" }\`

### 入出力例

\`\`\`js
canPerformAction("admin", "users", "read");
// → { allowed: true, reason: "ok" }   (admin の users は ["*"] でワイルドカード一致)

canPerformAction("admin", "posts", "delete");
// → { allowed: true, reason: "ok" }   (admin → editor 継承で posts.delete を見つける)

canPerformAction("viewer", "posts", "read");
// → { allowed: true, reason: "ok" }

canPerformAction("guest", "posts", "write");
// → { allowed: false, reason: "action-not-allowed" }

canPerformAction("guest", "comments", "read");
// → { allowed: false, reason: "unknown-resource" }   (guest に comments の定義は無く、 継承元も無い)

canPerformAction("ghost", "posts", "read");
// → { allowed: false, reason: "unknown-role" }

canPerformAction("", "posts", "read");
// → { allowed: false, reason: "invalid-input" }
\`\`\`

## ポイント

- これは **S5 卒業課題のひとつ**。 「長い if/switch を **データ + ルックアップ + 配列メソッド** に置き換える」 設計を、 さらに 「継承の連鎖」 「拒否理由を区別する」 などのリッチな仕様で総合演習します。
- **AST で switch 文を禁止** しています。 \`switch (role)\` で 4 つのケースを書くと AST forbidden に触れます — データ構造 \`PERMISSIONS\` をオブジェクトとしてルックアップする設計を強制します。
- AST で **\`includes\` メソッドの使用** を必須にしています。 action の含有判定はループ + \`===\` ではなく \`list.includes(action)\` で書いてください。
- AST で **\`MemberExpression\` の使用** を必須にしています。 \`PERMISSIONS[role]\` や \`entry[resource]\` のような **計算プロパティアクセス** を使うことが、 データ駆動設計のキモです。
- \`PERMISSIONS\` を関数内で書き換えないでください (\`push\` / \`sort\` / プロパティ代入はすべて NG)。 \`canPerformAction\` は **純粋関数** として呼び出し前後で \`PERMISSIONS\` の構造が変わらないこと、 同じ引数で 2 回呼んで同じ結果を返すことが要件です。
- 推奨フロー (\`while\` ループで継承を辿る):
  1. 入力検証で 3 引数を弾く
  2. \`PERMISSIONS[role]\` の存在チェック
  3. \`current = role\` から始め、 \`while\` で \`PERMISSIONS[current][resource]\` を順に確認。 見つかれば break。 無ければ \`current = PERMISSIONS[current].inherits\` で親に進む
  4. ループを抜けたら、 見つかったリスト or 未発見で分岐
  5. リストがあるなら \`"*"\` または \`action\` を \`.includes()\` で判定
`,
  starterFiles: singleFile(`const PERMISSIONS = {
  admin:  { inherits: "editor", users: ["*"] },
  editor: { inherits: "viewer", posts: ["read", "write", "delete"], comments: ["read", "write"] },
  viewer: { posts: ["read"], comments: ["read"] },
  guest:  { posts: ["read"] },
};

function canPerformAction(role, resource, action) {
  // 1. 入力検証
  //    role / resource / action のどれかが文字列でないか空文字なら、 不正入力として拒否を返す

  // 2. ロール解決
  //    マトリクスに該当ロールが無ければ、 未知ロールとして拒否を返す

  // 3. 継承の連鎖を辿りつつ、 対象リソースの許可リストを探す
  //    無限ループを避けるため最大 5 回などで打ち切る
  //    inherits は予約キーなので、 リソース名としては扱わないこと

  // 4. ループを抜けた時点でリストが見つかっていなければ、 未知リソースとして拒否を返す

  // 5. ワイルドカードを許可リストが含むなら許可

  // 6. リストが action を含むかをメソッドで判定し、 含めば許可、 そうでなければ アクション不可 として拒否

  // どの分岐でも、 戻り値は許可フラグと拒否理由を持つオブジェクト形に揃える
}
`),
  entryPoints: ["canPerformAction", "PERMISSIONS"],
  demoCall: `console.log(canPerformAction("admin", "posts", "delete"));`,
  tests: [
    {
      name: "admin/users/read は許可 (ワイルドカード一致)",
      code: `(() => {
        const r = canPerformAction("admin", "users", "read");
        return r.allowed === true && r.reason === "ok";
      })()`,
    },
    {
      name: "editor/posts/write は許可 (直接リスト)",
      code: `(() => {
        const r = canPerformAction("editor", "posts", "write");
        return r.allowed === true && r.reason === "ok";
      })()`,
    },
    {
      name: "viewer/posts/read は許可 (リーフロール)",
      code: `(() => {
        const r = canPerformAction("viewer", "posts", "read");
        return r.allowed === true && r.reason === "ok";
      })()`,
    },
    {
      name: "admin/posts/delete は継承を辿って許可 (admin → editor)",
      code: `(() => {
        const r = canPerformAction("admin", "posts", "delete");
        return r.allowed === true && r.reason === "ok";
      })()`,
    },
    {
      name: "editor/comments/write は許可 (editor が直接 comments.write を持つ)",
      code: `(() => {
        const r = canPerformAction("editor", "comments", "write");
        return r.allowed === true && r.reason === "ok";
      })()`,
    },
    {
      name: "guest/posts/write は アクション不可 (リソースはあるが action が無い)",
      code: `(() => {
        const r = canPerformAction("guest", "posts", "write");
        return r.allowed === false && r.reason === "action-not-allowed";
      })()`,
    },
    {
      name: "guest/comments/read は 未知リソース (guest に comments の定義が無く継承元も無い)",
      code: `(() => {
        const r = canPerformAction("guest", "comments", "read");
        return r.allowed === false && r.reason === "unknown-resource";
      })()`,
    },
    {
      name: "ghost/posts/read は 未知ロール",
      code: `(() => {
        const r = canPerformAction("ghost", "posts", "read");
        return r.allowed === false && r.reason === "unknown-role";
      })()`,
    },
    {
      name: "__proto__/posts/read も 未知ロール (プロトタイプ連鎖を拾わない)",
      code: `(() => {
        const r = canPerformAction("__proto__", "posts", "read");
        return r.allowed === false && r.reason === "unknown-role";
      })()`,
    },
    {
      name: "空文字 action は 不正入力",
      code: `(() => {
        const r = canPerformAction("viewer", "posts", "");
        return r.allowed === false && r.reason === "invalid-input";
      })()`,
    },
    {
      name: "null role は 不正入力",
      code: `(() => {
        const r = canPerformAction(null, "posts", "read");
        return r.allowed === false && r.reason === "invalid-input";
      })()`,
    },
    {
      name: "undefined resource は 不正入力",
      code: `(() => {
        const r = canPerformAction("viewer", undefined, "read");
        return r.allowed === false && r.reason === "invalid-input";
      })()`,
    },
    {
      name: "数値 action は 不正入力 (文字列でない)",
      code: `(() => {
        const r = canPerformAction("viewer", "posts", 42);
        return r.allowed === false && r.reason === "invalid-input";
      })()`,
    },
    {
      name: "PERMISSIONS は呼び出し前後で構造が変わらない (純粋関数)",
      code: `(() => {
        const snapshot = JSON.stringify(PERMISSIONS);
        canPerformAction("admin", "users", "read");
        canPerformAction("editor", "posts", "delete");
        canPerformAction("guest", "comments", "read");
        canPerformAction("ghost", "posts", "read");
        return JSON.stringify(PERMISSIONS) === snapshot;
      })()`,
    },
    {
      name: "同じ引数で 2 回呼ぶと同じ結果を返す",
      code: `(() => {
        const a = canPerformAction("admin", "posts", "delete");
        const b = canPerformAction("admin", "posts", "delete");
        return a.allowed === b.allowed && a.reason === b.reason;
      })()`,
    },
  ],
  hints: [
    "ロール解決はオブジェクトの固有プロパティチェックで行います。 Object.hasOwn(PERMISSIONS, role) が false なら 未知ロール。 単に !PERMISSIONS[role] と書くと、 role = \"__proto__\" のようなプロトタイプ連鎖の値を未知扱いできず通過してしまう罠があります。 if (role === \"admin\") の連鎖は AST で禁止されている switch と同じ匂いなのでやめます。",
    "継承の連鎖は while ループで current 変数を 1 つ持って辿るのが定石。 ループ脱出条件は 「current が undefined」 または 「該当リソースを見つけた」。 無限ループ防止に depth カウンタを上限 5 で見張ると安全です。",
    "ワイルドカード判定は list.includes(\"*\") を最初に置くと action の判定と並べやすい。 || で短絡させればワイルドカードか action か どちらかが該当すれば許可、 と 1 行で書けます。",
    "解答例:\n```js\nconst PERMISSIONS = {\n  admin:  { inherits: \"editor\", users: [\"*\"] },\n  editor: { inherits: \"viewer\", posts: [\"read\", \"write\", \"delete\"], comments: [\"read\", \"write\"] },\n  viewer: { posts: [\"read\"], comments: [\"read\"] },\n  guest:  { posts: [\"read\"] },\n};\n\nfunction canPerformAction(role, resource, action) {\n  if (typeof role !== \"string\" || role === \"\" ||\n      typeof resource !== \"string\" || resource === \"\" ||\n      typeof action !== \"string\" || action === \"\") {\n    return { allowed: false, reason: \"invalid-input\" };\n  }\n  if (!Object.hasOwn(PERMISSIONS, role)) {\n    return { allowed: false, reason: \"unknown-role\" };\n  }\n  let current = role;\n  let allowedList = null;\n  let depth = 0;\n  while (typeof current === \"string\" && Object.hasOwn(PERMISSIONS, current) && depth < 5) {\n    const entry = PERMISSIONS[current];\n    if (Array.isArray(entry[resource])) {\n      allowedList = entry[resource];\n      break;\n    }\n    current = entry.inherits;\n    depth += 1;\n  }\n  if (!allowedList) {\n    return { allowed: false, reason: \"unknown-resource\" };\n  }\n  if (allowedList.includes(\"*\") || allowedList.includes(action)) {\n    return { allowed: true, reason: \"ok\" };\n  }\n  return { allowed: false, reason: \"action-not-allowed\" };\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "MemberExpression", label: "PERMISSIONS[role] のようなデータルックアップを使う" },
        { kind: "node", nodeType: "WhileStatement", label: "while ループで継承チェーンを辿る" },
        { kind: "method", name: "includes", label: "includes で許可リストに action が含まれるかを判定する" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で 許可フラグと拒否理由を持つオブジェクトを返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
        { kind: "node", nodeType: "SwitchStatement", label: "switch ではなくデータ構造のルックアップで書く" },
      ],
    },
  },
  solution: `const PERMISSIONS = {
  admin:  { inherits: "editor", users: ["*"] },
  editor: { inherits: "viewer", posts: ["read", "write", "delete"], comments: ["read", "write"] },
  viewer: { posts: ["read"], comments: ["read"] },
  guest:  { posts: ["read"] },
};

function canPerformAction(role, resource, action) {
  if (typeof role !== "string" || role === "" ||
      typeof resource !== "string" || resource === "" ||
      typeof action !== "string" || action === "") {
    return { allowed: false, reason: "invalid-input" };
  }
  if (!Object.hasOwn(PERMISSIONS, role)) {
    return { allowed: false, reason: "unknown-role" };
  }
  let current = role;
  let allowedList = null;
  let depth = 0;
  while (typeof current === "string" && Object.hasOwn(PERMISSIONS, current) && depth < 5) {
    const entry = PERMISSIONS[current];
    if (Array.isArray(entry[resource])) {
      allowedList = entry[resource];
      break;
    }
    current = entry.inherits;
    depth += 1;
  }
  if (!allowedList) {
    return { allowed: false, reason: "unknown-resource" };
  }
  if (allowedList.includes("*") || allowedList.includes(action)) {
    return { allowed: true, reason: "ok" };
  }
  return { allowed: false, reason: "action-not-allowed" };
}
`,
  badSolutions: [
    {
      code: `const PERMISSIONS = {
  admin:  { inherits: "editor", users: ["*"] },
  editor: { inherits: "viewer", posts: ["read", "write", "delete"], comments: ["read", "write"] },
  viewer: { posts: ["read"], comments: ["read"] },
  guest:  { posts: ["read"] },
};

function canPerformAction(role, resource, action) {
  if (role === "admin") {
    if (resource === "users") {
      return { allowed: true, reason: "ok" };
    }
    if (resource === "posts" && (action === "read" || action === "write" || action === "delete")) {
      return { allowed: true, reason: "ok" };
    }
    return { allowed: false, reason: "action-not-allowed" };
  }
  if (role === "editor") {
    if (resource === "posts" && (action === "read" || action === "write" || action === "delete")) {
      return { allowed: true, reason: "ok" };
    }
    return { allowed: false, reason: "action-not-allowed" };
  }
  if (role === "viewer" && resource === "posts" && action === "read") {
    return { allowed: true, reason: "ok" };
  }
  if (role === "guest" && resource === "posts" && action === "read") {
    return { allowed: true, reason: "ok" };
  }
  return { allowed: false, reason: "unknown-role" };
}
`,
      description: "ロールごとに if 連鎖を書いており、 PERMISSIONS をルックアップしていない。 AST required の MemberExpression (データルックアップ) と includes が満たされず違反になる。 さらに不正入力の検出や 拒否理由の区別もできていない",
    },
    {
      code: `const PERMISSIONS = {
  admin:  { inherits: "editor", users: ["*"] },
  editor: { inherits: "viewer", posts: ["read", "write", "delete"], comments: ["read", "write"] },
  viewer: { posts: ["read"], comments: ["read"] },
  guest:  { posts: ["read"] },
};

function canPerformAction(role, resource, action) {
  if (typeof role !== "string" || role === "" ||
      typeof resource !== "string" || resource === "" ||
      typeof action !== "string" || action === "") {
    return { allowed: false, reason: "invalid-input" };
  }
  if (!PERMISSIONS[role]) {
    return { allowed: false, reason: "unknown-role" };
  }
  const entry = PERMISSIONS[role];
  if (!Array.isArray(entry[resource])) {
    return { allowed: false, reason: "unknown-resource" };
  }
  if (entry[resource].includes("*") || entry[resource].includes(action)) {
    return { allowed: true, reason: "ok" };
  }
  return { allowed: false, reason: "action-not-allowed" };
}
`,
      description: "継承の連鎖を辿っていない。 admin/posts/delete のように 親ロール (editor) で許可されている操作が 拒否されてしまう (テスト失敗)",
    },
    {
      code: `const PERMISSIONS = {
  admin:  { inherits: "editor", users: ["*"] },
  editor: { inherits: "viewer", posts: ["read", "write", "delete"], comments: ["read", "write"] },
  viewer: { posts: ["read"], comments: ["read"] },
  guest:  { posts: ["read"] },
};

function canPerformAction(role, resource, action) {
  if (typeof role !== "string" || role === "" ||
      typeof resource !== "string" || resource === "" ||
      typeof action !== "string" || action === "") {
    return { allowed: false, reason: "invalid-input" };
  }
  if (!PERMISSIONS[role]) {
    return { allowed: false, reason: "unknown-role" };
  }
  let current = role;
  let allowedList = null;
  let depth = 0;
  while (current && PERMISSIONS[current] && depth < 5) {
    const entry = PERMISSIONS[current];
    if (Array.isArray(entry[resource])) {
      allowedList = entry[resource];
      break;
    }
    current = entry.inherits;
    depth += 1;
  }
  if (!allowedList) {
    return { allowed: false, reason: "unknown-resource" };
  }
  if (allowedList.includes(action)) {
    return { allowed: true, reason: "ok" };
  }
  return { allowed: false, reason: "action-not-allowed" };
}
`,
      description: "ワイルドカード \"*\" の特別扱いを忘れている。 admin/users/read は users の許可リストが [\"*\"] のため 通常の includes(\"read\") では false になり、 ワイルドカード一致のテストが失敗する",
    },
    {
      code: `const PERMISSIONS = {
  admin:  { inherits: "editor", users: ["*"] },
  editor: { inherits: "viewer", posts: ["read", "write", "delete"], comments: ["read", "write"] },
  viewer: { posts: ["read"], comments: ["read"] },
  guest:  { posts: ["read"] },
};

function canPerformAction(role, resource, action) {
  if (typeof role !== "string" || role === "" ||
      typeof resource !== "string" || resource === "" ||
      typeof action !== "string" || action === "") {
    return { allowed: false, reason: "invalid-input" };
  }
  if (!PERMISSIONS[role]) {
    return { allowed: false, reason: "unknown-role" };
  }
  let current = role;
  let allowedList = null;
  let depth = 0;
  while (current && PERMISSIONS[current] && depth < 5) {
    const entry = PERMISSIONS[current];
    if (Array.isArray(entry[resource])) {
      entry[resource].sort();
      allowedList = entry[resource];
      break;
    }
    current = entry.inherits;
    depth += 1;
  }
  if (!allowedList) {
    return { allowed: false, reason: "unknown-resource" };
  }
  if (allowedList.includes("*") || allowedList.includes(action)) {
    return { allowed: true, reason: "ok" };
  }
  return { allowed: false, reason: "action-not-allowed" };
}
`,
      description: "見つけた許可リストを sort で破壊的に並べ替えており、 PERMISSIONS が呼び出し前後で構造変化する。 純粋関数性のテストに失敗する",
    },
  ],
  mdnSections: [
    {
      heading: "プロパティアクセサー",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Property_accessors",
      pageTitle: "プロパティアクセサー",
    },
    {
      heading: "Array.prototype.includes()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/includes",
      pageTitle: "Array.prototype.includes()",
    },
    {
      heading: "while",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/while",
      pageTitle: "while",
    },
    {
      heading: "Object.hasOwn()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn",
      pageTitle: "Object.hasOwn()",
    },
  ],
};
