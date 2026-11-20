# 04章 q08 文字列の解析

ドリルの問題を 1 問ずつ確認して提出してから、そのあとの問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q08 | 文字列の解析 | 20 問 | ★総合問題 |

## 課題の説明

★総合問題（コマンドの解析）で使う書き方を繰り返します。次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

文字列を split や slice で分け、数値に変え、形がおかしければ Error を投げる。メッセージは問題文のとおりにする。

数値かどうかは Number(…) と Number.isFinite、整数かどうかは Number.isInteger で確かめる。

総合問題では、q05 の `errorMessage`、q06 の `toNumber`、q07 の `assertNever` を `src/q08-command.ts` の中でもう一度書きます。

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q08-01-parse-key-value.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q08-command.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: 例外処理 (exception)](https://typescriptbook.jp/reference/statements/exception)
- [サバイバルTypeScript: unknown型と型の絞り込み (unknown)](https://typescriptbook.jp/reference/statements/unknown)
- [サバイバルTypeScript: unknown型と型の絞り込み (control-flow-analysis-and-type-guard)](https://typescriptbook.jp/reference/statements/control-flow-analysis-and-type-guard)
