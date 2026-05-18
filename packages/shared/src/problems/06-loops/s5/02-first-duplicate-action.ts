import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s5Ch06FirstDuplicateAction: Assignment = {
  id: "S5-Ch06-02-first-duplicate-action",
  stage: "S5",
  chapterId: "Ch06",
  sequence: 2,
  title: "ログを 1 周しながら最初に同じ操作を 2 回した userId を早期 return",
  newConcept:
    "Map<userId, Set<action>> という 「ループ + 入れ子データ構造」 を組み立てつつ、 重複が見つかった瞬間に return で打ち切る早期脱出パターンを身につける",
  estimatedMinutes: 55,
  difficulty: 2,
  testKind: "function",
  description: `## やること

操作ログの配列 \`logs\` (各要素は \`{ userId, action }\` の形) を受け取り、 **同じ userId が同じ action を 2 回以上行った最初のタイミング** で、 その \`userId\` を返す関数 \`firstDuplicateAction\` を実装してください。 一度も重複が無ければ \`null\` を返します。

- 「最初」 とは、 ログ配列を **左から走査して、 重複が確定したインデックスが最も早い** ものを指します
- 違う userId が同じ action を行うのは重複ではありません (各ユーザーごとに独立に判定する)
- 同じユーザーでも、 違う action なら重複ではありません

\`\`\`js
firstDuplicateAction([
  { userId: "u1", action: "click" },
  { userId: "u2", action: "view" },
  { userId: "u1", action: "click" },   // ← ここで u1 の click が 2 回目
]);
// → "u1"

firstDuplicateAction([
  { userId: "u1", action: "click" },
  { userId: "u2", action: "click" },   // 違うユーザーなので OK
  { userId: "u1", action: "view" },    // u1 は違う action なので OK
]);
// → null

firstDuplicateAction([]);                                            // → null
firstDuplicateAction([{ userId: "u1", action: "click" }]);           // → null
\`\`\`

## ポイント

- これは S5 (設計演習) の問題です。 「ループ + 入れ子データ構造」 と 「早期 return」 を組み合わせて、 **無駄なくログを 1 周だけ走査する** 設計を練習します。
- 推奨フロー (1 周だけで答えを出す):
  1. \`userActions = new Map()\` を用意する。 キー: \`userId\`、 値: その人が今までに行った action を貯める \`Set\`
  2. \`for...of\` で 1 件ずつログを処理する
  3. その userId が Map に未登場なら、 空の \`Set\` を初期登録する
  4. \`set.has(action)\` でその action が **既にこのユーザーに記録済みなら**、 その瞬間 \`return userId\` (早期脱出)
  5. まだなら \`set.add(action)\` で記録して次のログへ
  6. 走査終了まで一度も該当しなければ \`null\`
- **二重ループや indexOf による検索は不要**。 Set の \`.has(...)\` は平均 O(1) で 「すでに見たか」 を即答できるのが鍵。
- 早期 \`return\` を **\`break\` + フラグ + 後処理** で書くと無駄に行が増え、 「return の場所」 を見失います。 ループ内で答えが出たら関数ごと抜けるのが S4 から続く 「ループの早期脱出」 の王道です。
- AST で **\`new ...()\`** (Map / Set のコンストラクタ呼び出し) と **\`for...of\`**、 **\`.has\`** と **\`.add\`** の使用を必須にしています。
`,
  starterFiles: singleFile(`function firstDuplicateAction(logs) {
  // userId -> Set<action> を保持するための Map を用意する
  // ヒント: const userActions = new Map();


  // for...of で logs を 1 件ずつ処理する


  // その userId がまだ Map に無ければ、 空の Set を新規登録する


  // すでに同じ action がそのユーザーの Set に入っていれば、 重複が確定したので
  // その userId を即 return する (早期脱出)


  // 重複していなければ Set に action を追加して次のログへ進む


  // 全件処理しても重複が無ければ null
}
`),
  entryPoints: ["firstDuplicateAction"],
  demoCall: `console.log(firstDuplicateAction([
  { userId: "u1", action: "click" },
  { userId: "u2", action: "view" },
  { userId: "u1", action: "click" },
]));`,
  tests: [
    {
      name: "u1 が click を 2 回 → 'u1'",
      code: `firstDuplicateAction([{ userId: "u1", action: "click" }, { userId: "u2", action: "view" }, { userId: "u1", action: "click" }]) === "u1"`,
    },
    {
      name: "誰も同じ action を繰り返さない → null",
      code: `firstDuplicateAction([{ userId: "u1", action: "click" }, { userId: "u2", action: "click" }, { userId: "u1", action: "view" }]) === null`,
    },
    {
      name: "空配列は null",
      code: `firstDuplicateAction([]) === null`,
    },
    {
      name: "1 件だけは null",
      code: `firstDuplicateAction([{ userId: "u1", action: "click" }]) === null`,
    },
    {
      name: "違うユーザーが同じ action でも null (ユーザーごとに独立判定)",
      code: `firstDuplicateAction([{ userId: "u1", action: "buy" }, { userId: "u2", action: "buy" }, { userId: "u3", action: "buy" }]) === null`,
    },
    {
      name: "同じユーザーが違う action だけなら null",
      code: `firstDuplicateAction([{ userId: "u1", action: "a" }, { userId: "u1", action: "b" }, { userId: "u1", action: "c" }]) === null`,
    },
    {
      name: "後ろの方に重複があるケース",
      code: `firstDuplicateAction([{ userId: "u1", action: "a" }, { userId: "u2", action: "b" }, { userId: "u3", action: "c" }, { userId: "u2", action: "b" }]) === "u2"`,
    },
    {
      name: "複数の重複候補のうち、 最初に確定したユーザーを返す (u3 のほうが先に確定する)",
      code: `firstDuplicateAction([{ userId: "u1", action: "a" }, { userId: "u3", action: "x" }, { userId: "u3", action: "x" }, { userId: "u1", action: "a" }]) === "u3"`,
    },
    {
      name: "同じユーザーが 3 回同じ action をしても 「2 回目」 で打ち切られる",
      code: `firstDuplicateAction([{ userId: "u1", action: "ping" }, { userId: "u1", action: "ping" }, { userId: "u1", action: "ping" }]) === "u1"`,
    },
    {
      name: "戻り値の型: ヒットすると string、 ヒットしなければ null",
      code: `(() => { const a = firstDuplicateAction([{ userId: "x", action: "y" }, { userId: "x", action: "y" }]); const b = firstDuplicateAction([{ userId: "x", action: "y" }]); return typeof a === "string" && b === null; })()`,
    },
  ],
  hints: [
    "Map<userId, Set<action>> を組み立てます。 for...of の冒頭で 「未登場ユーザーの初期化」 を 1 行書いておくと、 以降の処理が if のネストにならずにすみます: if (!userActions.has(log.userId)) { userActions.set(log.userId, new Set()); }",
    "ループの中で「重複が確定した瞬間」 に return userId と書ければ完成です。 break + フラグ + 後で再ループ、 のような書き方は避けて、 「見つけた瞬間に関数ごと抜ける」 のが S4 から続くループの早期脱出の王道です。",
    "解答例:\n```js\nfunction firstDuplicateAction(logs) {\n  const userActions = new Map();\n  for (const log of logs) {\n    if (!userActions.has(log.userId)) {\n      userActions.set(log.userId, new Set());\n    }\n    const actions = userActions.get(log.userId);\n    if (actions.has(log.action)) {\n      return log.userId;\n    }\n    actions.add(log.action);\n  }\n  return null;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "NewExpression", label: "new Map() / new Set() でデータ構造を用意する" },
        { kind: "node", nodeType: "ForOfStatement", label: "for...of で logs を 1 周だけ走査する" },
        { kind: "method", name: "has", label: "Map.has / Set.has で既出かを判定する" },
        { kind: "method", name: "set", label: "Map.set で新規ユーザーを登録する" },
        { kind: "method", name: "get", label: "Map.get で userId に対応する Set を取得する" },
        { kind: "method", name: "add", label: "Set.add で action を記録する" },
        { kind: "node", nodeType: "IfStatement", label: "if で重複・未登場を判定する" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で早期脱出する (および最後に null を返す)" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
        { kind: "method", name: "indexOf", label: "indexOf による線形探索を使わない (ループ + 線形探索は二重ループと同じ計算量)" },
        { kind: "method", name: "map", label: "S5-Ch06 では .map を使わない (Ch09 で導入)" },
        { kind: "method", name: "filter", label: "S5-Ch06 では .filter を使わない (Ch09 で導入)" },
        { kind: "method", name: "reduce", label: "S5-Ch06 では .reduce を使わない (Ch09 で導入)" },
        { kind: "method", name: "sort", label: "S5-Ch06 では .sort を使わない (Ch09 で導入)" },
      ],
    },
  },
  solution: `function firstDuplicateAction(logs) {
  const userActions = new Map();
  for (const log of logs) {
    if (!userActions.has(log.userId)) {
      userActions.set(log.userId, new Set());
    }
    const actions = userActions.get(log.userId);
    if (actions.has(log.action)) {
      return log.userId;
    }
    actions.add(log.action);
  }
  return null;
}
`,
  badSolutions: [
    {
      code: `function firstDuplicateAction(logs) {
  for (let i = 0; i < logs.length; i++) {
    for (let j = i + 1; j < logs.length; j++) {
      if (logs[i].userId === logs[j].userId && logs[i].action === logs[j].action) {
        return logs[i].userId;
      }
    }
  }
  return null;
}
`,
      description: "二重ループ O(n²) で書いており、 Map / Set を使った 1 周 O(n) 設計を行っていない (AST required 違反)",
    },
    {
      code: `function firstDuplicateAction(logs) {
  const seen = new Set();
  for (const log of logs) {
    if (seen.has(log.action)) {
      return log.userId;
    }
    seen.add(log.action);
  }
  return null;
}
`,
      description: "userId ごとに Set を分けず、 全ユーザー共通の Set で action を覚えてしまっており、 違うユーザーが同じ action をしただけで重複扱いになる (AST required 違反 + テスト失敗)",
    },
    {
      code: `function firstDuplicateAction(logs) {
  const userActions = new Map();
  for (const log of logs) {
    if (!userActions.has(log.userId)) {
      userActions.set(log.userId, new Set());
    }
    const actions = userActions.get(log.userId);
    if (actions.has(log.action)) {
      return log.userId;
    }
    actions.add(log.action);
  }
  // 全件処理しても重複が無いケースに return を書き忘れている
}
`,
      description: "ループ後の return null を書き忘れており、 重複が無いケースで undefined を返す (テスト失敗)",
    },
    {
      code: `function firstDuplicateAction(logs) {
  const userActions = new Map();
  for (const log of logs) {
    if (!userActions.has(log.userId)) {
      userActions.set(log.userId, new Set());
    }
    const actions = userActions.get(log.userId);
    actions.add(log.action);
    if (actions.has(log.action)) {
      return log.userId;
    }
  }
  return null;
}
`,
      description: "add してから has を呼んでいるため、 1 回目の登録で必ずヒットしてしまい、 全ログで最初の userId を返してしまう (テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "Map",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Map",
      pageTitle: "Map",
    },
    {
      heading: "Set",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Set",
      pageTitle: "Set",
    },
    {
      heading: "for...of",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for...of",
      pageTitle: "for...of",
    },
  ],
};
