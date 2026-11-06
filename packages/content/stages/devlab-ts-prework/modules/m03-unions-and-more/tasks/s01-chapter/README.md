# 03章 ユニオン型とそのほかの型の問題

同じ番号では、ドリルを解いてから応用問題を解き、次の番号に進みます。

この課題で解くファイルです。

| 順番 | ファイル | 題 | 種類 | 問 |
| --- | --- | --- | --- | --- |
| 1 | `src/q01-union-type-alias.drill.ts` | 型エイリアスとユニオン型 | ドリル | 20 問 |
| 2 | `src/q01-union-type-alias.ts` | 型エイリアスとユニオン型 | 応用問題 |  |
| 3 | `src/q02-literal-union.drill.ts` | リテラル型のユニオン | ドリル | 20 問 |
| 4 | `src/q02-literal-union.ts` | リテラル型のユニオン | 応用問題 |  |
| 5 | `src/q03-null-undefined.drill.ts` | null と undefined | ドリル | 20 問 |
| 6 | `src/q03-null-undefined.ts` | null と undefined | 応用問題 |  |
| 7 | `src/q04-discriminated-union.drill.ts` | 判別可能なユニオン型 | ドリル | 20 問 |
| 8 | `src/q04-discriminated-union.ts` | 判別可能なユニオン型 | 応用問題 |  |
| 9 | `src/q05-result.drill.ts` | 成功と失敗を表す型 | ドリル | 20 問 |
| 10 | `src/q05-result.ts` | 成功と失敗を表す型 | 応用問題 |  |
| 11 | `src/q06-intersection.drill.ts` | インターセクション型 | ドリル | 20 問 |
| 12 | `src/q06-intersection.ts` | インターセクション型 | 応用問題 |  |
| 13 | `src/q07-as-const.drill.ts` | as const | ドリル | 20 問 |
| 14 | `src/q07-as-const.ts` | as const | 応用問題 |  |
| 15 | `src/q08-order-status.drill.ts` | 状態の切り替え | ドリル | 20 問 |
| 16 | `src/q08-order-status.ts` | 注文の状態遷移 | ★総合問題 |  |

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

- [サバイバルTypeScript: 型エイリアスとユニオン型 (type-alias)](https://typescriptbook.jp/reference/values-types-variables/type-alias)
- [サバイバルTypeScript: 型エイリアスとユニオン型 (union)](https://typescriptbook.jp/reference/values-types-variables/union)
- [サバイバルTypeScript: リテラル型 (literal-types)](https://typescriptbook.jp/reference/values-types-variables/literal-types)
- [サバイバルTypeScript: null と undefined (undefined-vs-null)](https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null)
- [サバイバルTypeScript: null と undefined (optional-chaining)](https://typescriptbook.jp/reference/values-types-variables/object/optional-chaining)
- [サバイバルTypeScript: 判別可能なユニオン型 (discriminated-union)](https://typescriptbook.jp/reference/values-types-variables/discriminated-union)
- [サバイバルTypeScript: インターセクション型 (intersection)](https://typescriptbook.jp/reference/values-types-variables/intersection)
- [サバイバルTypeScript: as const (const-assertion)](https://typescriptbook.jp/reference/values-types-variables/const-assertion)
