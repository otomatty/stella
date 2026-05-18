import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch03ClassifyChars: Assignment = {
  id: "S4-Ch03-03-classify-chars",
  stage: "S4",
  chapterId: "Ch03",
  sequence: 3,
  title: "文字種ごとの出現数を集計する",
  newConcept: "1 文字ずつ走査しながら if/else で「英大文字 / 英小文字 / 数字 / その他」 に振り分ける",
  estimatedMinutes: 30,
  difficulty: 2,
  testKind: "function",
  description: `## やること

文字列 \`s\` を受け取り、 各文字を **英大文字 / 英小文字 / 数字 / その他** の 4 カテゴリに分類した出現数を、 次の形のオブジェクトで返す関数 \`classifyChars\` を実装してください。

\`\`\`ts
{ upper: number, lower: number, digit: number, other: number }
\`\`\`

\`\`\`js
classifyChars("Hello123!");
// → { upper: 1, lower: 4, digit: 3, other: 1 }

classifyChars("");
// → { upper: 0, lower: 0, digit: 0, other: 0 }

classifyChars("ABC");
// → { upper: 3, lower: 0, digit: 0, other: 0 }

classifyChars("!@# ");
// → { upper: 0, lower: 0, digit: 0, other: 4 }   // 空白も other
\`\`\`

## ポイント

- **「英大文字」 は \`A\` 〜 \`Z\`、 「英小文字」 は \`a\` 〜 \`z\`、 「数字」 は \`0\` 〜 \`9\`。** その他はすべて \`other\` に入れます。
- 文字の比較は **文字列の比較** として書けます: \`ch >= "A" && ch <= "Z"\`。 文字コードを意識しなくても範囲判定できます。
- 集計の合計 (\`upper + lower + digit + other\`) は **必ず元の文字列長と一致する** はずです。 自分でも検算しましょう。
`,
  starterFiles: singleFile(`function classifyChars(s) {
  // 説明文の 4 カテゴリを 0 で初期化した集計用オブジェクトを用意する


  // for ループで s の各文字を 1 つずつ取り出す


  // 文字の比較で英大文字 / 英小文字 / 数字 / その他に if/else if で振り分け、 対応カテゴリを 1 増やす


  // ループを抜けたら集計用オブジェクトを return する
}
`),
  entryPoints: ["classifyChars"],
  demoCall: `console.log(classifyChars("Hello123!"));`,
  tests: [
    {
      name: 'classifyChars("Hello123!") は { upper: 1, lower: 4, digit: 3, other: 1 }',
      code: `(() => { const r = classifyChars("Hello123!"); return r.upper === 1 && r.lower === 4 && r.digit === 3 && r.other === 1; })()`,
    },
    {
      name: "空文字列は全カテゴリ 0",
      code: `(() => { const r = classifyChars(""); return r.upper === 0 && r.lower === 0 && r.digit === 0 && r.other === 0; })()`,
    },
    {
      name: '"ABC" は upper だけ 3',
      code: `(() => { const r = classifyChars("ABC"); return r.upper === 3 && r.lower === 0 && r.digit === 0 && r.other === 0; })()`,
    },
    {
      name: '"!@# " は other だけ 4 (空白も other)',
      code: `(() => { const r = classifyChars("!@# "); return r.upper === 0 && r.lower === 0 && r.digit === 0 && r.other === 4; })()`,
    },
    {
      name: '"abc" は lower だけ 3',
      code: `(() => { const r = classifyChars("abc"); return r.upper === 0 && r.lower === 3 && r.digit === 0 && r.other === 0; })()`,
    },
    {
      name: '"0123456789" は digit だけ 10',
      code: `(() => { const r = classifyChars("0123456789"); return r.digit === 10 && r.upper === 0 && r.lower === 0 && r.other === 0; })()`,
    },
    {
      name: "全カテゴリ合計が元の文字列長と一致する",
      code: `(() => { const s = "Mixed Input 42!"; const r = classifyChars(s); return r.upper + r.lower + r.digit + r.other === s.length; })()`,
    },
    {
      name: "戻り値には upper / lower / digit / other の 4 キーが揃う",
      code: `(() => { const keys = Object.keys(classifyChars("a")).sort(); return JSON.stringify(keys) === JSON.stringify(["digit", "lower", "other", "upper"]); })()`,
    },
  ],
  hints: [
    "for ループで 1 文字ずつ。 if / else if で 4 つに振り分けて、 対応するキーをインクリメント。",
    "解答例:\n```js\nfunction classifyChars(s) {\n  const result = { upper: 0, lower: 0, digit: 0, other: 0 };\n  for (let i = 0; i < s.length; i++) {\n    const ch = s[i];\n    if (ch >= \"A\" && ch <= \"Z\") {\n      result.upper++;\n    } else if (ch >= \"a\" && ch <= \"z\") {\n      result.lower++;\n    } else if (ch >= \"0\" && ch <= \"9\") {\n      result.digit++;\n    } else {\n      result.other++;\n    }\n  }\n  return result;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で集計結果を返す" },
        { kind: "node", nodeType: "IfStatement", label: "if で文字種を振り分ける" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function classifyChars(s) {
  const result = { upper: 0, lower: 0, digit: 0, other: 0 };
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch >= "A" && ch <= "Z") {
      result.upper++;
    } else if (ch >= "a" && ch <= "z") {
      result.lower++;
    } else if (ch >= "0" && ch <= "9") {
      result.digit++;
    } else {
      result.other++;
    }
  }
  return result;
}
`,
  badSolutions: [
    {
      code: `function classifyChars(s) {
  return { upper: 0, lower: 0, digit: 0, other: 0 };
}
`,
      description: "全て 0 を返している (テスト失敗)",
    },
    {
      code: `function classifyChars(s) {
  return { upper: 0, lower: s.length, digit: 0, other: 0 };
}
`,
      description: "全て lower 扱いにしており分類していない (AST required の if 不足 + テスト失敗)",
    },
    {
      code: `function classifyChars(s) {
  const result = { upper: 0, lower: 0, digit: 0, other: 0 };
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch >= "a" && ch <= "z") {
      result.lower++;
    } else {
      result.other++;
    }
  }
  return result;
}
`,
      description: "英小文字以外を全部 other に入れている (大文字や数字のテストが失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "文字列の比較",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String",
      pageTitle: "String",
    },
  ],
};
