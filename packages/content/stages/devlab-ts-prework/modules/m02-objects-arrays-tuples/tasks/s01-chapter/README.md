# 02章 オブジェクト・配列・タプルの問題

同じ番号では、ドリルを解いてから応用問題を解き、次の番号に進みます。

この課題で解くファイルです。

| 順番 | ファイル | 題 | 種類 | 問 |
| --- | --- | --- | --- | --- |
| 1 | `src/q01-object-type.drill.ts` | オブジェクトの型 | ドリル | 20 問 |
| 2 | `src/q01-object-type.ts` | オブジェクトの型 | 応用問題 |  |
| 3 | `src/q02-optional-readonly.drill.ts` | オプションプロパティと readonly | ドリル | 20 問 |
| 4 | `src/q02-optional-readonly.ts` | オプションプロパティと readonly | 応用問題 |  |
| 5 | `src/q03-destructuring-spread.drill.ts` | 分割代入とスプレッド構文 | ドリル | 20 問 |
| 6 | `src/q03-destructuring-spread.ts` | 分割代入とスプレッド構文 | 応用問題 |  |
| 7 | `src/q04-array-type.drill.ts` | 配列の型 | ドリル | 20 問 |
| 8 | `src/q04-array-type.ts` | 配列の型と読み取り専用の配列 | 応用問題 |  |
| 9 | `src/q05-non-destructive.drill.ts` | 配列を壊さない操作 | ドリル | 20 問 |
| 10 | `src/q05-non-destructive.ts` | 配列を壊さない操作 | 応用問題 |  |
| 11 | `src/q06-tuple.drill.ts` | タプル | ドリル | 20 問 |
| 12 | `src/q06-tuple.ts` | タプル | 応用問題 |  |
| 13 | `src/q07-structural-typing.drill.ts` | 構造的型付け | ドリル | 20 問 |
| 14 | `src/q07-structural-typing.ts` | 構造的型付け | 応用問題 |  |
| 15 | `src/q08-inventory.drill.ts` | インデックス型 | ドリル | 20 問 |
| 16 | `src/q08-inventory.ts` | 在庫の集計 | ★総合問題 |  |

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

- [サバイバルTypeScript: オブジェクトの型 (type-annotation-of-objects)](https://typescriptbook.jp/reference/values-types-variables/object/type-annotation-of-objects)
- [サバイバルTypeScript: オブジェクトの型 (shorthand-property-names)](https://typescriptbook.jp/reference/values-types-variables/object/shorthand-property-names)
- [サバイバルTypeScript: オプションプロパティと readonly (optional-property)](https://typescriptbook.jp/reference/values-types-variables/object/optional-property)
- [サバイバルTypeScript: オプションプロパティと readonly (readonly-property)](https://typescriptbook.jp/reference/values-types-variables/object/readonly-property)
- [サバイバルTypeScript: 分割代入とスプレッド構文 (destructuring-assignment-from-objects)](https://typescriptbook.jp/reference/values-types-variables/object/destructuring-assignment-from-objects)
- [サバイバルTypeScript: 分割代入とスプレッド構文 (spread-syntax-for-object)](https://typescriptbook.jp/reference/values-types-variables/object/spread-syntax-for-object)
- [サバイバルTypeScript: 配列の型 (type-annotation-of-array)](https://typescriptbook.jp/reference/values-types-variables/array/type-annotation-of-array)
- [サバイバルTypeScript: 配列の型 (readonly-array)](https://typescriptbook.jp/reference/values-types-variables/array/readonly-array)
- [サバイバルTypeScript: 配列の型 (how-to-loop-an-array)](https://typescriptbook.jp/reference/values-types-variables/array/how-to-loop-an-array)
- [サバイバルTypeScript: 配列を壊さない操作 (array-operations)](https://typescriptbook.jp/reference/values-types-variables/array/array-operations)
- [サバイバルTypeScript: 配列を壊さない操作 (spread-syntax-for-array)](https://typescriptbook.jp/reference/values-types-variables/array/spread-syntax-for-array)
- [サバイバルTypeScript: タプル (tuple)](https://typescriptbook.jp/reference/values-types-variables/tuple)
- [サバイバルTypeScript: タプル (destructuring-assignment-from-array)](https://typescriptbook.jp/reference/values-types-variables/array/destructuring-assignment-from-array)
- [サバイバルTypeScript: 構造的型付け (structural-subtyping)](https://typescriptbook.jp/reference/values-types-variables/structural-subtyping)
- [サバイバルTypeScript: 構造的型付け (excess-property-checking)](https://typescriptbook.jp/reference/values-types-variables/object/excess-property-checking)
- [サバイバルTypeScript: インデックス型 (index-signature)](https://typescriptbook.jp/reference/values-types-variables/object/index-signature)
- [サバイバルTypeScript: インデックス型 (how-to-loop-an-object)](https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object)
