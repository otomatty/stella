# 06章 クラスの問題

同じ番号では、ドリルを解いてから応用問題を解き、次の番号に進みます。

この課題で解くファイルです。

| 順番 | ファイル | 題 | 種類 | 問 |
| --- | --- | --- | --- | --- |
| 1 | `src/q01-class-basics.drill.ts` | クラスの基本 | ドリル | 20 問 |
| 2 | `src/q01-class-basics.ts` | クラスの基本 | 応用問題 |  |
| 3 | `src/q02-access-modifiers.drill.ts` | アクセス修飾子と readonly | ドリル | 20 問 |
| 4 | `src/q02-access-modifiers.ts` | アクセス修飾子と readonly | 応用問題 |  |
| 5 | `src/q03-interface.drill.ts` | インターフェース | ドリル | 20 問 |
| 6 | `src/q03-interface.ts` | インターフェース | 応用問題 |  |
| 7 | `src/q04-inheritance.drill.ts` | クラスの継承 | ドリル | 20 問 |
| 8 | `src/q04-inheritance.ts` | クラスの継承 | 応用問題 |  |
| 9 | `src/q05-todo-list.drill.ts` | 状態を持つクラス | ドリル | 20 問 |
| 10 | `src/q05-todo-list.ts` | ToDoリスト | ★総合問題 |  |

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

- [サバイバルTypeScript: クラスの基本 (constructor)](https://typescriptbook.jp/reference/object-oriented/class/constructor)
- [サバイバルTypeScript: クラスの基本 (fields)](https://typescriptbook.jp/reference/object-oriented/class/fields)
- [サバイバルTypeScript: クラスの基本 (methods)](https://typescriptbook.jp/reference/object-oriented/class/methods)
- [サバイバルTypeScript: クラスの基本 (field-initializers)](https://typescriptbook.jp/reference/object-oriented/class/field-initializers)
- [サバイバルTypeScript: アクセス修飾子と readonly (access-modifiers)](https://typescriptbook.jp/reference/object-oriented/class/access-modifiers)
- [サバイバルTypeScript: アクセス修飾子と readonly (readonly-modifier-in-classes)](https://typescriptbook.jp/reference/object-oriented/class/readonly-modifier-in-classes)
- [サバイバルTypeScript: アクセス修飾子と readonly (constructor-shorthand)](https://typescriptbook.jp/reference/object-oriented/class/constructor-shorthand)
- [サバイバルTypeScript: インターフェース (implementing-interfaces)](https://typescriptbook.jp/reference/object-oriented/interface/implementing-interfaces)
- [サバイバルTypeScript: インターフェース (interface-inheritance)](https://typescriptbook.jp/reference/object-oriented/interface/interface-inheritance)
- [サバイバルTypeScript: インターフェース (interface-vs-type-alias)](https://typescriptbook.jp/reference/object-oriented/interface/interface-vs-type-alias)
- [サバイバルTypeScript: インターフェース (readonly-modifier-in-interfaces)](https://typescriptbook.jp/reference/object-oriented/interface/readonly-modifier-in-interfaces)
- [サバイバルTypeScript: クラスの継承 (class-inheritance)](https://typescriptbook.jp/reference/object-oriented/class/class-inheritance)
- [サバイバルTypeScript: クラスの継承 (instanceof-operator)](https://typescriptbook.jp/reference/object-oriented/class/instanceof-operator)
