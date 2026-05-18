import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s5Ch03CsvWithHeaderParseCapstone: Assignment = {
  id: "S5-Ch03-03-csv-with-header-parse-capstone",
  stage: "S5",
  chapterId: "Ch03",
  sequence: 3,
  title: "[卒業課題] ヘッダ付き CSV をオブジェクト配列にパースする",
  newConcept:
    "ヘッダ行を 「キー集合」 として先に取り出し、 データ行ごとに値を写像してオブジェクト配列を組み立てる設計判断",
  estimatedMinutes: 75,
  difficulty: 3,
  testKind: "function",
  isCapstone: true,
  description: `## やること

カンマ区切り (CSV) の複数行文字列 \`csv\` を受け取り、 **1 行目をヘッダ (キー名) として** 残りのデータ行をオブジェクトの配列に変換する関数 \`parseCsvWithHeader\` を実装してください。

- **1 行目はヘッダ行** として扱い、 オブジェクトのキーに使います。
- 値はすべて **文字列のまま** にします (数値変換はしないでください)。
- データ行が 0 行 (ヘッダ行だけ) の場合は **空配列 \`[]\`** を返します。
- 入力末尾の空行や、 全体が空文字列のケースでも壊れないようにしてください。
- 引用符・エスケープは考慮しなくて構いません (素朴な CSV)。

\`\`\`js
parseCsvWithHeader("name,age,city\\nAlice,30,Tokyo\\nBob,25,Osaka");
// → [
//     { name: "Alice", age: "30", city: "Tokyo" },
//     { name: "Bob", age: "25", city: "Osaka" },
//   ]

parseCsvWithHeader("name,age");      // → []  (ヘッダしか無い)
parseCsvWithHeader("");                // → []
\`\`\`

## ポイント

- これは **S5 卒業課題候補のひとつ**。 paiza B/A 風の複数行入力モデルと、 S4 で扱ったオブジェクト操作を **統合した設計演習** です。
- 推奨フロー:
  1. \`csv.split("\\n")\` で行に分け、 **空行を除外** する (\`.filter((line) => line.length > 0)\`)
  2. 行が無ければ \`[]\` を early return
  3. **先頭行をヘッダ** (\`lines[0].split(",")\`) として取り出す
  4. **残りの行** (\`lines.slice(1)\`) を \`.map(...)\` で **1 行 → 1 オブジェクト** に変換
  5. 各行のオブジェクトは \`Object.fromEntries(headers.map((h, i) => [h, cells[i]]))\` で組み立てると簡潔
- AST で **\`split\` の使用** と **\`return\` 文** を必須にしています。 設計面では、 ヘッダの取り扱いを **データ行とは分ける** 構造化が要点です。
- 学習目標: 文字列処理のパイプライン (\`split → filter → map → return\`) を **設計レベルで** 組み立てられること。
`,
  starterFiles: singleFile(`function parseCsvWithHeader(csv) {
  // 1 行目をヘッダとして、 残りの行をオブジェクトの配列に変換して返してください
}
`),
  entryPoints: ["parseCsvWithHeader"],
  demoCall: `console.log(parseCsvWithHeader("name,age,city\\nAlice,30,Tokyo\\nBob,25,Osaka"));`,
  tests: [
    {
      name: "3 列 2 行を 2 要素のオブジェクト配列に変換できる",
      code: `(() => { const r = parseCsvWithHeader("name,age,city\\nAlice,30,Tokyo\\nBob,25,Osaka"); return r.length === 2 && r[0].name === "Alice" && r[0].age === "30" && r[0].city === "Tokyo" && r[1].name === "Bob" && r[1].age === "25" && r[1].city === "Osaka"; })()`,
    },
    {
      name: "2 列 1 行も正しく変換できる",
      code: `(() => { const r = parseCsvWithHeader("k,v\\nfoo,bar"); return r.length === 1 && r[0].k === "foo" && r[0].v === "bar"; })()`,
    },
    {
      name: "ヘッダのみの入力では空配列を返す",
      code: `(() => { const r = parseCsvWithHeader("name,age"); return Array.isArray(r) && r.length === 0; })()`,
    },
    {
      name: "空文字列の入力でも空配列を返す",
      code: `(() => { const r = parseCsvWithHeader(""); return Array.isArray(r) && r.length === 0; })()`,
    },
    {
      name: "末尾改行があっても行数は変わらず壊れない",
      code: `parseCsvWithHeader("name,age\\nAlice,30\\n").length === 1`,
    },
    {
      name: "空セルは空文字列としてオブジェクトに保持される",
      code: `(() => { const r = parseCsvWithHeader("a,b\\n1,"); return r[0].a === "1" && r[0].b === ""; })()`,
    },
    {
      name: "戻り値は配列",
      code: `Array.isArray(parseCsvWithHeader("a,b\\n1,2"))`,
    },
    {
      name: "各要素は普通のオブジェクト (配列ではない)",
      code: `(() => { const r = parseCsvWithHeader("a,b\\n1,2")[0]; return typeof r === "object" && r !== null && !Array.isArray(r); })()`,
    },
    {
      name: "各オブジェクトのキー集合はヘッダと一致する",
      code: `(() => { const r = parseCsvWithHeader("name,age,city\\nA,1,T")[0]; const keys = Object.keys(r).sort().join(","); return keys === "age,city,name"; })()`,
    },
    {
      name: "数値変換はしない (値は string のまま)",
      code: `typeof parseCsvWithHeader("k,v\\nfoo,123")[0].v === "string"`,
    },
  ],
  hints: [
    "まずは csv.split(\"\\n\").filter((line) => line.length > 0) で「空行を除いた行配列」 を作ってください。 そこから lines[0] をヘッダ、 lines.slice(1) をデータ行とし分けると設計がきれいになります。",
    "1 行 → 1 オブジェクトの組み立ては Object.fromEntries が便利です。 headers.map((h, i) => [h, cells[i]]) で [[キー, 値], ...] のタプル配列を作って渡すと一気に組めます。",
    "解答例:\n```js\nfunction parseCsvWithHeader(csv) {\n  const lines = csv.split(\"\\n\").filter((line) => line.length > 0);\n  if (lines.length === 0) {\n    return [];\n  }\n  const headers = lines[0].split(\",\");\n  return lines.slice(1).map((line) => {\n    const cells = line.split(\",\");\n    return Object.fromEntries(headers.map((h, i) => [h, cells[i]]));\n  });\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "split", label: "split で行・列に分解する" },
        {
          kind: "node",
          nodeType: "ReturnStatement",
          label: "配列を return で返す",
        },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function parseCsvWithHeader(csv) {
  const lines = csv.split("\\n").filter((line) => line.length > 0);
  if (lines.length === 0) {
    return [];
  }
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, cells[i]]));
  });
}
`,
  badSolutions: [
    {
      code: `function parseCsvWithHeader(csv) {
  const lines = csv.split("\\n").filter((line) => line.length > 0);
  if (lines.length === 0) {
    return [];
  }
  const headers = lines[0].split(",");
  return lines.map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, cells[i]]));
  });
}
`,
      description:
        "ヘッダ行もデータ行として扱っているので、 結果配列の先頭にヘッダ自身がオブジェクトとして混ざる (テスト失敗)",
    },
    {
      code: `function parseCsvWithHeader(csv) {
  const lines = csv.split("\\n").filter((line) => line.length > 0);
  if (lines.length === 0) {
    return [];
  }
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(cells.map((c, i) => ["col" + i, c]));
  });
}
`,
      description:
        "キー名を col0 / col1 ... の固定名にしておりヘッダを反映していない (テスト失敗)",
    },
    {
      code: `function parseCsvWithHeader(csv) {
  const lines = csv.split("\\n").filter((line) => line.length > 0);
  if (lines.length < 2) {
    return [];
  }
  const headers = lines[0].split(",");
  const cells = lines[1].split(",");
  return Object.fromEntries(headers.map((h, i) => [h, cells[i]]));
}
`,
      description:
        "配列ではなく単一オブジェクトを返している。 複数行の入力で 2 行目以降が落ちる (テスト失敗)",
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
      heading: "Array.prototype.map()",
      pageUrl:
        "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/map",
      pageTitle: "Array.prototype.map()",
    },
    {
      heading: "Object.fromEntries()",
      pageUrl:
        "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Object/fromEntries",
      pageTitle: "Object.fromEntries()",
    },
  ],
};
