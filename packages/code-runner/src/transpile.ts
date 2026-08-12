/**
 * 学習者が書いた TypeScript を QuickJS で実行できる JS に落とす。
 *
 * 型検査はしない。構文エラーだけを例外にする。
 * ponytail: 型エラーは採点に反映されない (transpileModule は semantic diagnostics を出さない)。
 *   型エラー自体をアサートしたい課題が出てきたら ts.createProgram + lib.d.ts を worker に載せる。
 *   現状の 126 問はすべて「直したコードの実行結果」で判定できるため、そこまでは要らない。
 * ponytail: import 名が `typescript` ではなく `typescript-transpiler` (npm:typescript@5.x のエイリアス)
 *   なのは重複依存ではなく必須。 repo の `typescript@7.0.2` は Go ネイティブ移植版で、
 *   `transpileModule` を持たずネイティブ実行ファイルを起動する Node 専用ラッパのためブラウザで動かない。
 */

// ponytail: module: None なので学習者コードは「単一ファイルのスクリプト」前提。
//   `export` を書くと CJS の `exports.x = ...` が emit され、 QuickJS で
//   ReferenceError になる (JS 課題も同じ制約)。 課題文で export を使わせないこと。

import ts from "typescript-transpiler";

export function transpileTypeScript(source: string): string {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.None,
      removeComments: false,
    },
    reportDiagnostics: true,
  });

  const fatal = (result.diagnostics ?? []).filter(
    (d) => d.category === ts.DiagnosticCategory.Error,
  );
  if (fatal.length > 0) {
    const messages = fatal
      .map((d) => `TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`)
      .join("\n");
    throw new Error(messages);
  }

  return result.outputText;
}
