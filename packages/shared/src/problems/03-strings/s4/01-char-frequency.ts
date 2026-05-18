import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch03CharFrequency: Assignment = {
  id: "S4-Ch03-01-char-frequency",
  stage: "S4",
  chapterId: "Ch03",
  sequence: 1,
  title: "文字列の各文字の出現回数を集計する",
  newConcept: "文字列を 1 文字ずつ走査し、 オブジェクトをカウンタとして使う",
  estimatedMinutes: 25,
  difficulty: 1,
  testKind: "function",
  description: `## やること

文字列 \`s\` を受け取り、 **「各文字 → 出現回数」** の対応を持つ **オブジェクト** を返す関数 \`charFrequency\` を実装してください。 大文字小文字は **区別する** ものとします。

\`\`\`js
charFrequency("hello");       // → { h: 1, e: 1, l: 2, o: 1 }
charFrequency("aaa");         // → { a: 3 }
charFrequency("");            // → {}
charFrequency("AaA");         // → { A: 2, a: 1 }   // 大文字小文字は別カウント
\`\`\`

## ポイント

- 文字列の 1 文字を取り出すには \`s[i]\` または \`s.charAt(i)\` を使います。
- カウンタの初期値は \`obj[ch] ?? 0\` で表現すると 「未登場なら 0、 登場済みなら現在値」 が 1 行で書けます。
- Map の代わりに **普通のオブジェクト** を使うのが本問題の意図です (\`Map\` は Ch10 で扱います)。
`,
  starterFiles: singleFile(`function charFrequency(s) {
  // 各文字の出現回数を集計したオブジェクトを返してください
}
`),
  entryPoints: ["charFrequency"],
  demoCall: `console.log(charFrequency("hello"));`,
  tests: [
    {
      name: 'charFrequency("hello") の l は 2',
      code: `charFrequency("hello").l === 2`,
    },
    {
      name: 'charFrequency("hello") の h / e / o はそれぞれ 1',
      code: `(() => { const r = charFrequency("hello"); return r.h === 1 && r.e === 1 && r.o === 1; })()`,
    },
    {
      name: 'charFrequency("aaa") の a は 3',
      code: `charFrequency("aaa").a === 3`,
    },
    {
      name: 'charFrequency("") はキーを持たない',
      code: `Object.keys(charFrequency("")).length === 0`,
    },
    {
      name: "大文字と小文字は別のキーとして集計される",
      code: `(() => { const r = charFrequency("AaA"); return r.A === 2 && r.a === 1; })()`,
    },
    {
      name: "登場しない文字のキーは undefined",
      code: `charFrequency("abc").z === undefined`,
    },
    {
      name: "戻り値はオブジェクト (配列ではない)",
      code: `(() => { const r = charFrequency("x"); return typeof r === "object" && r !== null && !Array.isArray(r); })()`,
    },
    {
      name: "全カウントの合計が元の文字列長と一致する",
      code: `(() => { const r = charFrequency("banana"); return Object.values(r).reduce((a, b) => a + b, 0) === 6; })()`,
    },
  ],
  hints: [
    "for (let i = 0; i < s.length; i++) で 1 文字ずつ。 counts[ch] = (counts[ch] ?? 0) + 1 で加算。",
    "解答例:\n```js\nfunction charFrequency(s) {\n  const counts = {};\n  for (let i = 0; i < s.length; i++) {\n    const ch = s[i];\n    counts[ch] = (counts[ch] ?? 0) + 1;\n  }\n  return counts;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で集計結果を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function charFrequency(s) {
  const counts = {};
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    counts[ch] = (counts[ch] ?? 0) + 1;
  }
  return counts;
}
`,
  badSolutions: [
    {
      code: `function charFrequency(s) {
  return {};
}
`,
      description: "常に空オブジェクトを返している (テスト失敗)",
    },
    {
      code: `function charFrequency(s) {
  const counts = {};
  for (let i = 0; i < s.length; i++) {
    counts[s[i]] = 1;
  }
  return counts;
}
`,
      description: "毎回 1 を代入しており出現回数を加算していない (テスト失敗)",
    },
    {
      code: `function charFrequency(s) {
  return { length: s.length };
}
`,
      description: "文字数だけを返しており各文字別の集計になっていない (テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "文字列の各文字へのアクセス",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/charAt",
      pageTitle: "String.prototype.charAt()",
    },
  ],
};
