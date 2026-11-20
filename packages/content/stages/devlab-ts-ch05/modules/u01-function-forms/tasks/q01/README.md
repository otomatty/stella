# 05章 q01 関数宣言・関数式・アロー関数

ドリルの問題を 1 問ずつ確認して提出してから、応用問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q01 | 関数宣言・関数式・アロー関数 | 20 問 | 応用問題 |

## 課題の説明

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

書き方（関数宣言・関数式・アロー関数）は、問題のコードに用意してある形のまま使う。引数、型、中身を書き足す。

アロー関数は、中身が1つの式なら (n: number): number => n * 2 のように { } と return を省略できる。

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q01-01-add3.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q01-function-forms.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: 関数宣言・関数式・アロー関数 (function-declaration)](https://typescriptbook.jp/reference/functions/function-declaration)
- [サバイバルTypeScript: 関数宣言・関数式・アロー関数 (function-expression)](https://typescriptbook.jp/reference/functions/function-expression)
- [サバイバルTypeScript: 関数宣言・関数式・アロー関数 (arrow-functions)](https://typescriptbook.jp/reference/functions/arrow-functions)
