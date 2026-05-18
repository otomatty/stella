import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch03IsAnagram: Assignment = {
  id: "S4-Ch03-02-is-anagram",
  stage: "S4",
  chapterId: "Ch03",
  sequence: 2,
  title: "アナグラム判定 (大文字小文字を無視)",
  newConcept: "文字を並べ替えて 「同じ文字を同じ数だけ持つか」 を比較する",
  estimatedMinutes: 25,
  difficulty: 2,
  testKind: "function",
  description: `## やること

2 つの文字列 \`a\` と \`b\` を受け取り、 互いに **アナグラム** (使われている文字の種類と数が完全に同じで、 順序だけ違う) なら \`true\`、 そうでなければ \`false\` を返す関数 \`isAnagram\` を実装してください。

判定は **大文字小文字を区別しません**。 空白や記号は **そのまま 1 文字として** 扱います。

\`\`\`js
isAnagram("listen", "silent");   // → true
isAnagram("Listen", "Silent");   // → true   (大小は無視)
isAnagram("hello", "world");     // → false
isAnagram("abc", "abcd");        // → false  (長さが違う)
isAnagram("", "");               // → true   (どちらも空)
isAnagram("aabb", "abab");       // → true
\`\`\`

## ポイント

- **長さが違えばその時点で false** にできます。 早期 return で処理を短く。
- もっとも素直な実装は **両方を小文字化 → 1 文字ずつバラす → 並べ替える (\`sort\`) → \`join\` で文字列に戻す** → \`===\` 比較。
- 1 行で書くと: \`a.toLowerCase().split("").sort().join("") === b.toLowerCase().split("").sort().join("")\`。
`,
  starterFiles: singleFile(`function isAnagram(a, b) {
  // 大文字小文字を無視して、 並べ替えると同じ文字列になるかを返してください
}
`),
  entryPoints: ["isAnagram"],
  demoCall: `console.log(isAnagram("listen", "silent"));`,
  tests: [
    {
      name: 'isAnagram("listen", "silent") は true',
      code: `isAnagram("listen", "silent") === true`,
    },
    {
      name: 'isAnagram("Listen", "Silent") は true (大小を無視)',
      code: `isAnagram("Listen", "Silent") === true`,
    },
    {
      name: 'isAnagram("hello", "world") は false',
      code: `isAnagram("hello", "world") === false`,
    },
    {
      name: "長さが違えば false",
      code: `isAnagram("abc", "abcd") === false`,
    },
    {
      name: '空文字列同士は true',
      code: `isAnagram("", "") === true`,
    },
    {
      name: 'isAnagram("aabb", "abab") は true (出現数が同じ)',
      code: `isAnagram("aabb", "abab") === true`,
    },
    {
      name: 'isAnagram("aabb", "aabc") は false',
      code: `isAnagram("aabb", "aabc") === false`,
    },
    {
      name: '記号も 1 文字として比較する (isAnagram("ab!", "ab?") は false)',
      code: `isAnagram("ab!", "ab?") === false`,
    },
    {
      name: '空白も 1 文字として比較する (isAnagram("a b", "b a") は true)',
      code: `isAnagram("a b", "b a") === true`,
    },
    {
      name: "戻り値は真偽値",
      code: `typeof isAnagram("a", "a") === "boolean"`,
    },
  ],
  hints: [
    "両方を小文字化 → split → sort → join。 結果が一致すればアナグラム。",
    "解答例:\n```js\nfunction isAnagram(a, b) {\n  if (a.length !== b.length) {\n    return false;\n  }\n  const normalize = (s) => s.toLowerCase().split(\"\").sort().join(\"\");\n  return normalize(a) === normalize(b);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で真偽値を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function isAnagram(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  const normalize = (s) => s.toLowerCase().split("").sort().join("");
  return normalize(a) === normalize(b);
}
`,
  badSolutions: [
    {
      code: `function isAnagram(a, b) {
  return true;
}
`,
      description: "常に true を返している (テスト失敗)",
    },
    {
      code: `function isAnagram(a, b) {
  return a === b;
}
`,
      description: "並べ替えずに直接比較しているのでアナグラムとして検出できない (テスト失敗)",
    },
    {
      code: `function isAnagram(a, b) {
  return a.length === b.length;
}
`,
      description: "長さだけを見ており文字の中身を比べていない (テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "String.prototype.split()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/split",
      pageTitle: "String.prototype.split()",
    },
    {
      heading: "Array.prototype.sort()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/sort",
      pageTitle: "Array.prototype.sort()",
    },
  ],
};
