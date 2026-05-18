import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch03CaesarCipher: Assignment = {
  id: "S4-Ch03-04-caesar-cipher",
  stage: "S4",
  chapterId: "Ch03",
  sequence: 4,
  title: "シーザー暗号で英字をずらす",
  newConcept: "charCodeAt と String.fromCharCode で文字コードを操作する",
  estimatedMinutes: 35,
  difficulty: 3,
  testKind: "function",
  description: `## やること

文字列 \`s\` と **0 以上 25 以下の整数** \`shift\` を受け取り、 英字 (\`a\`-\`z\` / \`A\`-\`Z\`) を **アルファベット順に \`shift\` 文字ぶん後ろにずらした** 文字列を返す関数 \`caesarCipher\` を実装してください。

- 大文字は大文字、 小文字は小文字のまま変換します (大小は保つ)。
- \`z\` の次は \`a\` に戻ります (\`Z\` の次は \`A\`)。
- **英字以外** (数字、 空白、 記号、 日本語など) は **変換せずそのまま** 出力します。

\`\`\`js
caesarCipher("abc", 1);                 // → "bcd"
caesarCipher("xyz", 3);                 // → "abc"   (z の次は a に戻る)
caesarCipher("ABC", 1);                 // → "BCD"
caesarCipher("Hello, World!", 13);      // → "Uryyb, Jbeyq!"   (ROT13)
caesarCipher("abc", 0);                 // → "abc"   (シフト 0 はそのまま)
caesarCipher("a1!Z", 1);                // → "b1!A"  (英字以外はそのまま)
\`\`\`

## ポイント

- **\`s.charCodeAt(i)\`** で i 番目の文字の文字コードが取れます (\`a\` は 97、 \`z\` は 122、 \`A\` は 65、 \`Z\` は 90)。
- **\`String.fromCharCode(code)\`** で文字コードを文字に戻せます。
- ずらした後にアルファベットの範囲をはみ出さないように、 **\`(code - base + shift) % 26 + base\`** という定型式が使えます (base は \`a\` なら 97、 \`A\` なら 65)。
- 英字以外は \`s[i]\` をそのまま結果文字列に足せば OK。
`,
  starterFiles: singleFile(`function caesarCipher(s, shift) {
  // 英字だけを shift 文字ぶん後ろにずらして、 それ以外はそのまま返してください
}
`),
  entryPoints: ["caesarCipher"],
  demoCall: `console.log(caesarCipher("Hello, World!", 13));`,
  tests: [
    {
      name: 'caesarCipher("abc", 1) は "bcd"',
      code: `caesarCipher("abc", 1) === "bcd"`,
    },
    {
      name: 'caesarCipher("xyz", 3) は "abc" (z の次は a)',
      code: `caesarCipher("xyz", 3) === "abc"`,
    },
    {
      name: 'caesarCipher("ABC", 1) は "BCD" (大文字を保つ)',
      code: `caesarCipher("ABC", 1) === "BCD"`,
    },
    {
      name: 'caesarCipher("XYZ", 3) は "ABC" (大文字も折り返し)',
      code: `caesarCipher("XYZ", 3) === "ABC"`,
    },
    {
      name: 'caesarCipher("Hello, World!", 13) は "Uryyb, Jbeyq!" (ROT13)',
      code: `caesarCipher("Hello, World!", 13) === "Uryyb, Jbeyq!"`,
    },
    {
      name: 'caesarCipher("abc", 0) は元と同じ',
      code: `caesarCipher("abc", 0) === "abc"`,
    },
    {
      name: 'caesarCipher("a1!Z", 1) は "b1!A" (英字以外はそのまま)',
      code: `caesarCipher("a1!Z", 1) === "b1!A"`,
    },
    {
      name: 'caesarCipher("", 5) は ""',
      code: `caesarCipher("", 5) === ""`,
    },
    {
      name: "shift = 25 でも全て英字の範囲に収まる",
      code: `caesarCipher("abc", 25) === "zab"`,
    },
  ],
  hints: [
    "charCodeAt で文字コードを取り、 (code - 97 + shift) % 26 + 97 で小文字をずらす。 大文字は base を 65 に。",
    "解答例:\n```js\nfunction caesarCipher(s, shift) {\n  let result = \"\";\n  for (let i = 0; i < s.length; i++) {\n    const code = s.charCodeAt(i);\n    if (code >= 97 && code <= 122) {\n      result += String.fromCharCode((code - 97 + shift) % 26 + 97);\n    } else if (code >= 65 && code <= 90) {\n      result += String.fromCharCode((code - 65 + shift) % 26 + 65);\n    } else {\n      result += s[i];\n    }\n  }\n  return result;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で変換後の文字列を返す" },
        { kind: "method", name: "charCodeAt", label: "charCodeAt で文字コードを取る" },
        { kind: "method", name: "fromCharCode", label: "String.fromCharCode で文字コードを文字に戻す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function caesarCipher(s, shift) {
  let result = "";
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= 97 && code <= 122) {
      result += String.fromCharCode((code - 97 + shift) % 26 + 97);
    } else if (code >= 65 && code <= 90) {
      result += String.fromCharCode((code - 65 + shift) % 26 + 65);
    } else {
      result += s[i];
    }
  }
  return result;
}
`,
  badSolutions: [
    {
      code: `function caesarCipher(s, shift) {
  return s;
}
`,
      description: "入力をそのまま返している (AST required 違反 + テスト失敗)",
    },
    {
      code: `function caesarCipher(s, shift) {
  let result = "";
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    result += String.fromCharCode(code + shift);
  }
  return result;
}
`,
      description: "範囲チェックも mod 26 もせずにそのまま足しており、 z の折り返しや非英字の処理で失敗する",
    },
    {
      code: `function caesarCipher(s, shift) {
  let result = "";
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= 97 && code <= 122) {
      result += String.fromCharCode((code - 97 + shift) % 26 + 97);
    } else {
      result += s[i];
    }
  }
  return result;
}
`,
      description: "大文字を変換していない (ABC のテストが失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "String.prototype.charCodeAt()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/charCodeAt",
      pageTitle: "String.prototype.charCodeAt()",
    },
    {
      heading: "String.fromCharCode()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/fromCharCode",
      pageTitle: "String.fromCharCode()",
    },
  ],
};
