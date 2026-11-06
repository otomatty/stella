# 05章 関数の問題

同じ番号では、ドリルを解いてから応用問題を解き、次の番号に進みます。

この課題で解くファイルです。

| 順番 | ファイル | 題 | 種類 | 問 |
| --- | --- | --- | --- | --- |
| 1 | `src/q01-function-forms.drill.ts` | 関数宣言・関数式・アロー関数 | ドリル | 20 問 |
| 2 | `src/q01-function-forms.ts` | 関数宣言・関数式・アロー関数 | 応用問題 |  |
| 3 | `src/q02-params-return.drill.ts` | 引数と戻り値の型、void | ドリル | 20 問 |
| 4 | `src/q02-params-return.ts` | 引数と戻り値の型、void | 応用問題 |  |
| 5 | `src/q03-optional-params.drill.ts` | オプション引数 | ドリル | 20 問 |
| 6 | `src/q03-optional-params.ts` | オプション引数 | 応用問題 |  |
| 7 | `src/q04-default-params.drill.ts` | デフォルト引数 | ドリル | 20 問 |
| 8 | `src/q04-default-params.ts` | デフォルト引数 | 応用問題 |  |
| 9 | `src/q05-rest-params.drill.ts` | 残余引数 | ドリル | 20 問 |
| 10 | `src/q05-rest-params.ts` | 残余引数 | 応用問題 |  |
| 11 | `src/q06-destructuring-params.drill.ts` | 分割代入引数 | ドリル | 20 問 |
| 12 | `src/q06-destructuring-params.ts` | 分割代入引数 | 応用問題 |  |
| 13 | `src/q07-callback.drill.ts` | コールバック関数 | ドリル | 20 問 |
| 14 | `src/q07-callback.ts` | コールバック関数 | 応用問題 |  |
| 15 | `src/q08-closures.drill.ts` | 関数を返す関数 | ドリル | 20 問 |
| 16 | `src/q08-closures.ts` | 関数を返す関数 | 応用問題 |  |
| 17 | `src/q09-type-guards.drill.ts` | 型ガード関数とアサーション関数 | ドリル | 20 問 |
| 18 | `src/q09-type-guards.ts` | 型ガード関数とアサーション関数 | 応用問題 |  |
| 19 | `src/q10-array-utils.drill.ts` | 配列のユーティリティ | ドリル | 20 問 |
| 20 | `src/q10-array-utils.ts` | 配列のユーティリティ | ★総合問題 |  |

## 進め方

ファイルの先頭の問題文を読んで、コードを書きます。

VS Code のコマンド「STELLA: 課題を確認する」で確かめます。依存パッケージの準備、ESLint、Prettier、型の確認 (tsc)、テストの順に進みます。

全部が通ったら、課題のパネルから提出します。章の全部が通るまで提出できません。全部の章を解き終える必要はありません。提出した章の課題を数えます。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く
- 提出のときの説明の欄には、詰まったところと調べたこと (何を読んで解決したか) を書く

## 教材

- [サバイバルTypeScript: 関数宣言・関数式・アロー関数 (function-declaration)](https://typescriptbook.jp/reference/functions/function-declaration)
- [サバイバルTypeScript: 関数宣言・関数式・アロー関数 (function-expression)](https://typescriptbook.jp/reference/functions/function-expression)
- [サバイバルTypeScript: 関数宣言・関数式・アロー関数 (arrow-functions)](https://typescriptbook.jp/reference/functions/arrow-functions)
- [サバイバルTypeScript: 引数と戻り値の型、void (function-parameters)](https://typescriptbook.jp/reference/functions/function-parameters)
- [サバイバルTypeScript: 引数と戻り値の型、void (void-type)](https://typescriptbook.jp/reference/functions/void-type)
- [サバイバルTypeScript: 引数と戻り値の型、void (pass-by-value)](https://typescriptbook.jp/reference/functions/pass-by-value)
- [サバイバルTypeScript: オプション引数 (optional-parameters)](https://typescriptbook.jp/reference/functions/optional-parameters)
- [サバイバルTypeScript: デフォルト引数 (default-parameters)](https://typescriptbook.jp/reference/functions/default-parameters)
- [サバイバルTypeScript: 残余引数 (rest-parameters)](https://typescriptbook.jp/reference/functions/rest-parameters)
- [サバイバルTypeScript: 分割代入引数 (destructuring-assignment-parameters)](https://typescriptbook.jp/reference/functions/destructuring-assignment-parameters)
- [サバイバルTypeScript: 分割代入引数 (keyword-arguments-and-options-object-pattern)](https://typescriptbook.jp/reference/functions/keyword-arguments-and-options-object-pattern)
- [サバイバルTypeScript: コールバック関数 (callback-functions)](https://typescriptbook.jp/reference/functions/callback-functions)
- [サバイバルTypeScript: コールバック関数 (function-type-declaration)](https://typescriptbook.jp/reference/functions/function-type-declaration)
- [サバイバルTypeScript: 関数を返す関数 (function-is-a-value)](https://typescriptbook.jp/reference/functions/function-is-a-value)
- [サバイバルTypeScript: 型ガード関数とアサーション関数 (type-guard-functions)](https://typescriptbook.jp/reference/functions/type-guard-functions)
- [サバイバルTypeScript: 型ガード関数とアサーション関数 (assertion-functions)](https://typescriptbook.jp/reference/functions/assertion-functions)
- [サバイバルTypeScript: 配列を壊さない操作 (array-operations)](https://typescriptbook.jp/reference/values-types-variables/array/array-operations)
