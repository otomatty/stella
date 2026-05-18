import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s5Ch03CsvToMarkdownTable: Assignment = {
  id: "S5-Ch03-01-csv-to-markdown-table",
  stage: "S5",
  chapterId: "Ch03",
  sequence: 1,
  title: "CSV を Markdown 表にフォーマット変換する",
  newConcept:
    "複数行文字列を 1 引数で受け取り、 split で行・列に分解 → 加工 → join で再構築するパイプライン",
  estimatedMinutes: 50,
  difficulty: 2,
  testKind: "function",
  description: `## やること

カンマ区切り (CSV) で複数行の表が入った文字列 \`csv\` を受け取り、 **GitHub Flavored Markdown の表** に変換する関数 \`csvToMarkdownTable\` を実装してください。

- 入力の **1 行目はヘッダ行** として扱います。
- 出力は **「ヘッダ行 → セパレータ行 (\`---\`) → 残りのデータ行」** の順で改行 (\`\\n\`) でつなぎます。
- 各セルは \`| \` と \` |\` で挟み、 セル間は \` | \` (前後にスペース) で区切ります。
- 最終行のあとに **余計な改行は付けない** こと。

\`\`\`js
csvToMarkdownTable("name,age\\nAlice,30\\nBob,25");
// →
// | name | age |
// | --- | --- |
// | Alice | 30 |
// | Bob | 25 |

csvToMarkdownTable("a,b,c\\n1,2,3");
// →
// | a | b | c |
// | --- | --- | --- |
// | 1 | 2 | 3 |
\`\`\`

## ポイント

- これは S5 (設計演習) の問題です。 paiza B/A 風に **「複数行文字列を 1 引数で受け取って 1 度に処理する」** モデルに慣れることが目的です。
- 推奨フロー:
  1. \`csv.split("\\n")\` で行に分解し、 **空行を除外** する (\`.filter((line) => line.length > 0)\`) — 末尾改行や空入力でも壊れないようにするため
  2. 行が無ければ空文字列 \`""\` を early return
  3. 各行を \`.split(",")\` で列に分解
  4. ヘッダ行から **列数と同じ長さの \`["---", "---", ...]\` セパレータ** を作る
  5. 各行を \`\\\`| \${cells.join(" | ")} |\\\`\` のテンプレートで整形
  6. すべてを \`.join("\\n")\` で結合
- AST で **\`split\` の使用** と **\`join\` の使用** を必須にしているので、 固定文字列を返すだけの実装や \`for\` ループでの直接連結は通りません。
- ヘッダだけの 1 行入力 (例: \`"name,age"\`) の場合は、 セパレータ行まで含めた **2 行** の出力になります。
- 空文字列 \`""\` を渡されたときは **空文字列を返す** ことにします。
`,
  starterFiles: singleFile(`function csvToMarkdownTable(csv) {
  // CSV を Markdown 表に変換して返してください
  // ヒント: split で行・列に分解 → 加工 → join で結合
}
`),
  entryPoints: ["csvToMarkdownTable"],
  demoCall: `console.log(csvToMarkdownTable("name,age\\nAlice,30\\nBob,25"));`,
  tests: [
    {
      name: "2 列 2 行の CSV を Markdown 表に変換できる",
      code: `csvToMarkdownTable("name,age\\nAlice,30\\nBob,25") === "| name | age |\\n| --- | --- |\\n| Alice | 30 |\\n| Bob | 25 |"`,
    },
    {
      name: "3 列の CSV ではセパレータも 3 列分になる",
      code: `csvToMarkdownTable("a,b,c\\n1,2,3") === "| a | b | c |\\n| --- | --- | --- |\\n| 1 | 2 | 3 |"`,
    },
    {
      name: "ヘッダ 1 行だけの入力は ヘッダ行 + セパレータ行 (合計 2 行) を返す",
      code: `csvToMarkdownTable("name,age") === "| name | age |\\n| --- | --- |"`,
    },
    {
      name: "単一列の CSV も変換できる",
      code: `csvToMarkdownTable("x\\n1\\n2") === "| x |\\n| --- |\\n| 1 |\\n| 2 |"`,
    },
    {
      name: "空セルがあってもセル数を保って出力する",
      code: `csvToMarkdownTable("a,b\\n1,\\n,2") === "| a | b |\\n| --- | --- |\\n| 1 |  |\\n|  | 2 |"`,
    },
    {
      name: "戻り値は文字列",
      code: `typeof csvToMarkdownTable("a\\n1") === "string"`,
    },
    {
      name: "末尾に余計な改行は付かない",
      code: `csvToMarkdownTable("a,b\\n1,2").endsWith("|")`,
    },
    {
      name: "出力の 2 行目は必ずセパレータ行になっている",
      code: `csvToMarkdownTable("h1,h2,h3\\nv1,v2,v3").split("\\n")[1] === "| --- | --- | --- |"`,
    },
    {
      name: "データ行は (入力行数 - 1) 行ぶん追加される",
      code: `csvToMarkdownTable("a,b\\n1,2\\n3,4\\n5,6").split("\\n").length === 5`,
    },
    {
      name: "末尾改行があっても空セル行が混ざらない",
      code: `csvToMarkdownTable("a,b\\nAlice,30\\n") === "| a | b |\\n| --- | --- |\\n| Alice | 30 |"`,
    },
    {
      name: "空文字列入力では空文字列を返す",
      code: `csvToMarkdownTable("") === ""`,
    },
  ],
  hints: [
    "csv.split(\"\\n\") で行に分け、 .filter((line) => line.length > 0) で空行を除いてから処理を始めると、 末尾改行や空入力で壊れません。",
    "セパレータ行は ヘッダの列数と同じ長さの [\"---\", \"---\", ...] を作って \" | \" で繋ぐと作れます。 ヘッダ行を `.map(() => \"---\")` で写像すると簡潔です。",
    "解答例:\n```js\nfunction csvToMarkdownTable(csv) {\n  const lines = csv.split(\"\\n\").filter((line) => line.length > 0);\n  if (lines.length === 0) {\n    return \"\";\n  }\n  const rows = lines.map((row) => row.split(\",\"));\n  const formatRow = (cells) => `| ${cells.join(\" | \")} |`;\n  const headerLine = formatRow(rows[0]);\n  const separatorLine = formatRow(rows[0].map(() => \"---\"));\n  const bodyLines = rows.slice(1).map(formatRow);\n  return [headerLine, separatorLine, ...bodyLines].join(\"\\n\");\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "split", label: "split で行・列に分解する" },
        { kind: "method", name: "join", label: "join で結合する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function csvToMarkdownTable(csv) {
  const lines = csv.split("\\n").filter((line) => line.length > 0);
  if (lines.length === 0) {
    return "";
  }
  const rows = lines.map((row) => row.split(","));
  const formatRow = (cells) => \`| \${cells.join(" | ")} |\`;
  const headerLine = formatRow(rows[0]);
  const separatorLine = formatRow(rows[0].map(() => "---"));
  const bodyLines = rows.slice(1).map(formatRow);
  return [headerLine, separatorLine, ...bodyLines].join("\\n");
}
`,
  badSolutions: [
    {
      code: `function csvToMarkdownTable(csv) {
  return csv
    .split("\\n")
    .map((row) => \`| \${row.split(",").join(" | ")} |\`)
    .join("\\n");
}
`,
      description:
        "ヘッダ直後のセパレータ行 (| --- | --- |) を出力していない (テスト失敗)",
    },
    {
      code: `function csvToMarkdownTable(csv) {
  return "| name | age |\\n| --- | --- |\\n| Alice | 30 |\\n| Bob | 25 |";
}
`,
      description:
        "入力を見ず固定文字列を返している。 別の CSV では一致しない (AST required 違反 + テスト失敗)",
    },
    {
      code: `function csvToMarkdownTable(csv) {
  const rows = csv.split("\\n");
  return rows
    .map((row, i) => {
      const [c1, c2] = row.split(",");
      if (i === 0) {
        return \`| \${c1} | \${c2} |\\n| --- | --- |\`;
      }
      return \`| \${c1} | \${c2} |\`;
    })
    .join("\\n");
}
`,
      description: "2 列固定の実装。 3 列以上の CSV で出力が崩れる (テスト失敗)",
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
      heading: "Array.prototype.join()",
      pageUrl:
        "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/join",
      pageTitle: "Array.prototype.join()",
    },
    {
      heading: "テンプレートリテラル",
      pageUrl:
        "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Template_literals",
      pageTitle: "テンプレートリテラル",
    },
  ],
};
