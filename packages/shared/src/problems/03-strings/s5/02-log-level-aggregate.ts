import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s5Ch03LogLevelAggregate: Assignment = {
  id: "S5-Ch03-02-log-level-aggregate",
  stage: "S5",
  chapterId: "Ch03",
  sequence: 2,
  title: "複数行ログをパースしてラベル別件数を集計する",
  newConcept:
    "各行を split して構造化する + S4 のオブジェクトカウンタを「行単位」 に応用する",
  estimatedMinutes: 55,
  difficulty: 2,
  testKind: "function",
  description: `## やること

ログを 1 行 1 件で書いた複数行文字列 \`logText\` を受け取り、 **ログレベルごとの件数** をオブジェクトで返す関数 \`aggregateLogs\` を実装してください。

各行は **\`"LEVEL: message"\`** の形式 (LEVEL とメッセージは \`": "\` (コロン+空白) で区切られる) です。 集計対象は **LEVEL の部分だけ**、 メッセージ側は無視します。

- **空行は無視** します (末尾改行や空入力でも安全に動くようにしてください)。
- 入力全体が空文字列 (\`""\`) のときは \`{}\` を返します。

\`\`\`js
aggregateLogs("INFO: started\\nERROR: oops\\nINFO: done\\nWARN: slow");
// → { INFO: 2, ERROR: 1, WARN: 1 }

aggregateLogs("INFO: a\\nINFO: b\\nINFO: c");
// → { INFO: 3 }

aggregateLogs("");
// → {}
\`\`\`

## ポイント

- これは S5 (設計演習) の問題です。 paiza B/A 風に **「複数行文字列を 1 引数で受け取って、 行ごとに分けてから処理する」** モデルに慣れることが目的です。
- 推奨フロー:
  1. \`logText.split("\\n")\` で行に分け、 **空行を除外** する (\`.filter((line) => line.length > 0)\`)
  2. 各行を \`line.split(": ")\` で **\`["LEVEL", "message..."]\`** に分け、 先頭を採用
  3. 集計用オブジェクト \`counts\` に対して、 S4 でやった \`counts[level] = (counts[level] ?? 0) + 1\` で加算
- AST で **\`split\` の使用** と **\`return\` 文** を必須にしています。
- メッセージ側に \`": "\` が含まれる可能性も想定し、 「最初の \`": "\` で区切って **左側だけ取る**」 が安全な実装になります (\`split(": ")[0]\` で十分)。
`,
  starterFiles: singleFile(`function aggregateLogs(logText) {
  // 各行を分割し、 ラベル別の件数を集計したオブジェクトを返してください
}
`),
  entryPoints: ["aggregateLogs"],
  demoCall: `console.log(aggregateLogs("INFO: started\\nERROR: oops\\nINFO: done\\nWARN: slow"));`,
  tests: [
    {
      name: "4 行混在のログから { INFO: 2, ERROR: 1, WARN: 1 } を集計できる",
      code: `(() => { const r = aggregateLogs("INFO: started\\nERROR: oops\\nINFO: done\\nWARN: slow"); return r.INFO === 2 && r.ERROR === 1 && r.WARN === 1; })()`,
    },
    {
      name: "同一ラベルが連続する場合も正しく集計できる",
      code: `aggregateLogs("INFO: a\\nINFO: b\\nINFO: c").INFO === 3`,
    },
    {
      name: "空文字列入力では空オブジェクトを返す",
      code: `(() => { const r = aggregateLogs(""); return Object.keys(r).length === 0; })()`,
    },
    {
      name: "末尾改行があっても空ラベル '' を集計対象にしない",
      code: `aggregateLogs("INFO: x\\n")[""] === undefined`,
    },
    {
      name: "末尾改行込みでも他のラベル件数は正しい",
      code: `aggregateLogs("INFO: x\\n").INFO === 1`,
    },
    {
      name: "ラベルだけを取り出す (メッセージ部分はキーに混ざらない)",
      code: `(() => { const r = aggregateLogs("INFO: hello world"); return r.INFO === 1 && r["hello world"] === undefined; })()`,
    },
    {
      name: "戻り値はオブジェクト (配列ではない)",
      code: `(() => { const r = aggregateLogs("X: y"); return typeof r === "object" && r !== null && !Array.isArray(r); })()`,
    },
    {
      name: "集計合計が空行を除いた行数と一致する",
      code: `(() => { const r = aggregateLogs("INFO: 1\\nERROR: 2\\nINFO: 3\\nINFO: 4\\nWARN: 5"); return Object.values(r).reduce((a, b) => a + b, 0) === 5; })()`,
    },
    {
      name: "メッセージ側にコロンが含まれていてもラベルだけ取り出せる",
      code: `aggregateLogs("INFO: connected to db: ok").INFO === 1`,
    },
  ],
  hints: [
    "logText.split(\"\\n\") で行に分け、 空行は filter((line) => line.length > 0) で除外しておくと末尾改行や空入力でも壊れません。",
    "各行から ラベルを取り出すのは line.split(\": \")[0] が一番簡潔です。 メッセージ側にコロンがあっても先頭だけ取れば安全です。",
    "解答例:\n```js\nfunction aggregateLogs(logText) {\n  const lines = logText.split(\"\\n\").filter((line) => line.length > 0);\n  const counts = {};\n  for (const line of lines) {\n    const [level] = line.split(\": \");\n    counts[level] = (counts[level] ?? 0) + 1;\n  }\n  return counts;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "split", label: "split で行・ラベルに分解する" },
        {
          kind: "node",
          nodeType: "ReturnStatement",
          label: "集計結果を return で返す",
        },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function aggregateLogs(logText) {
  const lines = logText.split("\\n").filter((line) => line.length > 0);
  const counts = {};
  for (const line of lines) {
    const [level] = line.split(": ");
    counts[level] = (counts[level] ?? 0) + 1;
  }
  return counts;
}
`,
  badSolutions: [
    {
      code: `function aggregateLogs(logText) {
  const lines = logText.split("\\n").filter((line) => line.length > 0);
  const counts = {};
  for (const line of lines) {
    const parts = line.split(": ");
    const message = parts[1];
    counts[message] = (counts[message] ?? 0) + 1;
  }
  return counts;
}
`,
      description:
        "ラベルではなくメッセージ側でカウントしている。 INFO/ERROR/WARN のキーが立たない (テスト失敗)",
    },
    {
      code: `function aggregateLogs(logText) {
  const lines = logText.split("\\n");
  const counts = {};
  for (const line of lines) {
    const [level] = line.split(": ");
    counts[level] = (counts[level] ?? 0) + 1;
  }
  return counts;
}
`,
      description:
        "空行を除外していないので、 末尾改行の入力で空ラベル '' がキーに混入する (テスト失敗)",
    },
    {
      code: `function aggregateLogs(logText) {
  const lines = logText.split("\\n").filter((line) => line.length > 0);
  const counts = {};
  for (const line of lines) {
    const [level] = line.split(": ");
    counts[level] = 1;
  }
  return counts;
}
`,
      description:
        "加算ではなく毎回 1 を代入しているので同じラベルが複数回出ても 1 になる (テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "String.prototype.split()",
      pageUrl:
        "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/split",
      pageTitle: "String.prototype.split()",
    },
    {
      heading: "Array.prototype.filter()",
      pageUrl:
        "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/filter",
      pageTitle: "Array.prototype.filter()",
    },
    {
      heading: "Null 合体演算子 (??)",
      pageUrl:
        "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing",
      pageTitle: "Null 合体演算子 (??)",
    },
  ],
};
