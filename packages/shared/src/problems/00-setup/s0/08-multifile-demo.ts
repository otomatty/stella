import type { Assignment } from "../../../types.js";

/**
 * 多ファイル UI (FileTabs) の動作確認用ダミー課題 (#100 / #106)。
 *
 * 注意: ファイル間の `import` (モジュール解決) はまだ未対応。
 * 採点は `entryFile` = `main.js` の内容を単独で QuickJS に渡す。
 * `utils.js` は読み取り専用にして、 学習者が「採点対象外のファイル」 を体感できるようにする。
 */
export const s0Ch00MultiFileDemo: Assignment = {
  id: "S0-Ch00-08-multifile-demo",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 8,
  title: "多ファイル UI のデモ (採点は main.js のみ)",
  newConcept: "上部のタブで複数ファイルを切り替えられる",
  estimatedMinutes: 3,
  difficulty: 1,
  testKind: "stdout",
  language: "javascript",
  entryFile: "main.js",
  starterFiles: [
    {
      path: "main.js",
      content: `// 採点対象は main.js だけです。 utils.js は読み取り専用 (デモ用) です。
// console.log で "Hello multi-file" を出してみましょう。

`,
    },
    {
      path: "utils.js",
      content: `// このタブは多ファイル UI の表示確認用です。
// 現状ではファイル間の import (モジュール解決) はまだ未対応で、 採点は main.js のみが対象です。
// 将来は ESM の import / export を解決して採点する予定 (#100)。

export const demoNote = "multi-file scaffold";
`,
      readonly: true,
    },
  ],
  description: `## やること

エディタ上部のタブで \`main.js\` と \`utils.js\` を切り替えられることを確認し、 \`main.js\` だけを編集して
出力を **\`Hello multi-file\`** にしてください。

このデモでは:

- **採点対象は \`main.js\` のみ** です ( \`entryFile\` )
- \`utils.js\` は読み取り専用で、 多ファイル UI の表示確認用です
- ファイル間の \`import\` (モジュール解決) は将来対応予定 (#100)

## 期待する出力

\`\`\`
Hello multi-file
\`\`\`
`,
  tests: [
    {
      name: "stdout が Hello multi-file になる",
      expectedStdout: "Hello multi-file",
    },
  ],
  hints: [
    "`console.log(\"Hello multi-file\");` を `main.js` に書きます。",
    "上部のタブで `utils.js` を開いても、 採点には影響しません。",
  ],
  solution: `console.log("Hello multi-file");
`,
};
