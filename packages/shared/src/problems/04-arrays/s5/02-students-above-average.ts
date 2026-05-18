import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s5Ch04StudentsAboveAverage: Assignment = {
  id: "S5-Ch04-02-students-above-average",
  stage: "S5",
  chapterId: "Ch04",
  sequence: 2,
  title: "2 つの配列を組み合わせて平均点超えの学生を並べる",
  newConcept:
    "同じインデックスで連動する 2 配列を 1 つのオブジェクト配列に合成 → 集計値 (平均) を計算 → filter + sort で抽出する設計",
  estimatedMinutes: 55,
  difficulty: 2,
  testKind: "function",
  description: `## やること

学生名の配列 \`names\` と、 それに **同じインデックスで対応する** 点数の配列 \`scores\` を受け取り、 **平均点を超える** 学生の名前を **点数の降順** で並べた配列にして返す関数 \`studentsAboveAverage\` を実装してください。

- 平均点は \`scores\` 全体の合計を要素数で割ったもの
- **平均点ちょうどは含めない** (\`score > avg\`)
- 点数が同じ場合は **名前の昇順 (文字列の辞書順)** で並べる
- \`names\` と \`scores\` が空のときは \`[]\` を返す
- \`names\` と \`scores\` は **必ず同じ長さ** で渡される前提で構いません

\`\`\`js
studentsAboveAverage(["Alice", "Bob", "Carol"], [60, 80, 40]);
// avg = (60 + 80 + 40) / 3 = 60
// → ["Bob"]   // 60 ちょうどの Alice は除外、 80 の Bob のみ

studentsAboveAverage(
  ["Alice", "Bob", "Carol", "Dan"],
  [50, 90, 70, 90],
);
// avg = 75
// → ["Bob", "Dan"]   // 同点なので名前昇順

studentsAboveAverage([], []);                            // → []
studentsAboveAverage(["A", "B"], [80, 80]);              // → []  (全員平均ちょうど)
\`\`\`

## ポイント

- これは S5 (設計演習) の問題です。 **複数の配列を組み合わせて 1 つのデータに合成する** 設計を練習します。
- 推奨フロー:
  1. \`scores.length === 0\` なら \`[]\` を early return
  2. \`scores\` の合計を for ループで求め、 平均 \`avg\` を計算する (\`reduce\` は Ch09 で導入するのでここでは使わない)
  3. \`names.map((name, i) => ({ name, score: scores[i] }))\` で **\`[{ name, score }, ...]\`** に合成
  4. \`.filter((s) => s.score > avg)\` で平均超えだけを残す
  5. \`.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))\` で **score 降順 + name 昇順** の 2 段ソート
  6. \`.map((s) => s.name)\` で名前だけを取り出す
- この問題は AST で **\`map\` / \`filter\` / \`sort\`** の使用を必須にしているため、 **\`map → filter → sort → map\`** のパイプライン構造で実装してください (合計計算には for ループを使って構いません)。
`,
  starterFiles: singleFile(`function studentsAboveAverage(names, scores) {
  // scores が空のときは早期 return で空配列を返す


  // for ループで scores の合計を求めて要素数で割り、 平均値を変数に入れる


  // names を map でインデックス連動して走査し、 説明文の中間要素形 (名前と点数を持つオブジェクト) に合成する


  // filter で点数が平均値より大きい要素だけを残す


  // sort で点数の降順 + 名前の昇順 (localeCompare) の 2 段ソートに並べ替える


  // map で名前プロパティだけを取り出して return する
}
`),
  entryPoints: ["studentsAboveAverage"],
  demoCall: `console.log(studentsAboveAverage(["Alice", "Bob", "Carol"], [60, 80, 40]));`,
  tests: [
    {
      name: "平均超えが 1 人 (Bob のみ) のケース",
      code: `JSON.stringify(studentsAboveAverage(["Alice", "Bob", "Carol"], [60, 80, 40])) === JSON.stringify(["Bob"])`,
    },
    {
      name: "平均超えが複数人、 同点は名前昇順 (入力順は逆)",
      code: `JSON.stringify(studentsAboveAverage(["Dan", "Carol", "Bob", "Alice"], [90, 70, 90, 50])) === JSON.stringify(["Bob", "Dan"])`,
    },
    {
      name: "空配列を渡すと空配列を返す",
      code: `JSON.stringify(studentsAboveAverage([], [])) === JSON.stringify([])`,
    },
    {
      name: "全員が平均ちょうどなら空配列",
      code: `JSON.stringify(studentsAboveAverage(["A", "B"], [80, 80])) === JSON.stringify([])`,
    },
    {
      name: "1 人だけのケースは平均 = 自分自身なので空",
      code: `JSON.stringify(studentsAboveAverage(["Solo"], [100])) === JSON.stringify([])`,
    },
    {
      name: "点数が降順に並ぶ (最も高い人が先頭)",
      code: `studentsAboveAverage(["A", "B", "C"], [10, 100, 20])[0] === "B"`,
    },
    {
      name: "平均ちょうどは含めない (Alice は除外)",
      code: `!studentsAboveAverage(["Alice", "Bob", "Carol"], [60, 80, 40]).includes("Alice")`,
    },
    {
      name: "戻り値は配列",
      code: `Array.isArray(studentsAboveAverage(["A"], [1]))`,
    },
    {
      name: "戻り値の要素は文字列 (名前)",
      code: `typeof studentsAboveAverage(["A", "B"], [10, 90])[0] === "string"`,
    },
    {
      name: "負の点数でも正しく動く",
      code: `JSON.stringify(studentsAboveAverage(["A", "B", "C"], [-10, -5, -30])) === JSON.stringify(["B", "A"])`,
    },
    {
      name: "5 人の混在ケース",
      code: `JSON.stringify(studentsAboveAverage(["A", "B", "C", "D", "E"], [50, 60, 70, 80, 90])) === JSON.stringify(["E", "D"])`,
    },
  ],
  hints: [
    "まず平均 avg を求めます (for ループで合計を計算して要素数で割る)。 空配列のときに 0 除算しないよう早期 return しておくと安全です。 `reduce` は Ch09 で導入するのでここでは使いません。",
    "names と scores を合成するには names.map((name, i) => ({ name, score: scores[i] })) が定番。 これでオブジェクト配列を作ってから filter / sort で扱うと設計がきれいです。",
    "解答例:\n```js\nfunction studentsAboveAverage(names, scores) {\n  if (scores.length === 0) {\n    return [];\n  }\n  let sum = 0;\n  for (const score of scores) {\n    sum += score;\n  }\n  const avg = sum / scores.length;\n  return names\n    .map((name, i) => ({ name, score: scores[i] }))\n    .filter((s) => s.score > avg)\n    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))\n    .map((s) => s.name);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "map", label: "map で 2 配列を { name, score } に合成 / 名前だけ取り出す" },
        { kind: "method", name: "filter", label: "filter で平均超えだけを残す" },
        { kind: "method", name: "sort", label: "sort で score 降順 + name 昇順に並べる" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で名前配列を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
        { kind: "method", name: "reduce", label: "reduce は Ch09 で導入するのでここでは使わない" },
      ],
    },
  },
  solution: `function studentsAboveAverage(names, scores) {
  if (scores.length === 0) {
    return [];
  }
  let sum = 0;
  for (const score of scores) {
    sum += score;
  }
  const avg = sum / scores.length;
  return names
    .map((name, i) => ({ name, score: scores[i] }))
    .filter((s) => s.score > avg)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((s) => s.name);
}
`,
  badSolutions: [
    {
      code: `function studentsAboveAverage(names, scores) {
  if (scores.length === 0) {
    return [];
  }
  let sum = 0;
  for (const score of scores) {
    sum += score;
  }
  const avg = sum / scores.length;
  return names
    .map((name, i) => ({ name, score: scores[i] }))
    .filter((s) => s.score >= avg)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((s) => s.name);
}
`,
      description: "条件が >= になっており、 平均ちょうどの学生も含まれてしまう (テスト失敗)",
    },
    {
      code: `function studentsAboveAverage(names, scores) {
  if (scores.length === 0) {
    return [];
  }
  let sum = 0;
  for (const score of scores) {
    sum += score;
  }
  const avg = sum / scores.length;
  return names
    .map((name, i) => ({ name, score: scores[i] }))
    .filter((s) => s.score > avg)
    .sort((a, b) => a.score - b.score)
    .map((s) => s.name);
}
`,
      description: "score を昇順にソートしているため降順の期待値と一致しない (テスト失敗)",
    },
    {
      code: `function studentsAboveAverage(names, scores) {
  if (scores.length === 0) {
    return [];
  }
  let sum = 0;
  for (const score of scores) {
    sum += score;
  }
  const avg = sum / scores.length;
  const result = [];
  for (let i = 0; i < names.length; i++) {
    if (scores[i] > avg) {
      result.push(names[i]);
    }
  }
  return result;
}
`,
      description: "for ループで実装しているが map / filter / sort を 1 つも使っていない (AST required 違反)",
    },
    {
      code: `function studentsAboveAverage(names, scores) {
  if (scores.length === 0) {
    return [];
  }
  let sum = 0;
  for (const score of scores) {
    sum += score;
  }
  const avg = sum / scores.length;
  return names
    .map((name, i) => ({ name, score: scores[i] }))
    .filter((s) => s.score > avg)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.name);
}
`,
      description: "同点のときの名前タイブレークが無いため、 同点で並んだケースで期待順にならない (テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "Array.prototype.map()",
      pageUrl:
        "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/map",
      pageTitle: "Array.prototype.map()",
    },
    {
      heading: "Array.prototype.filter()",
      pageUrl:
        "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/filter",
      pageTitle: "Array.prototype.filter()",
    },
    {
      heading: "Array.prototype.sort()",
      pageUrl:
        "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/sort",
      pageTitle: "Array.prototype.sort()",
    },
  ],
};
