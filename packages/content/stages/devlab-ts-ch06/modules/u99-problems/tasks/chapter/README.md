# 06章 クラスの問題

同じ番号では、ドリルの問題を 1 問ずつ確認して提出してから、応用問題に進みます。

問題の一覧です。課題のパネルにも出ます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q01 | クラスの基本 | 1 問 | 応用問題 |
| q02 | アクセス修飾子と readonly | 1 問 | 応用問題 |
| q03 | インターフェース | 1 問 | 応用問題 |
| q04 | クラスの継承 | 1 問 | 応用問題 |
| q05 | 状態を持つクラス | 1 問 | ★総合問題 |

## 進め方

1 問確認して提出し、次の問題へ進みます。

確認と提出は、VS Code 拡張（「STELLA: 課題を確認する」と課題のパネル）か、CLI の `stella check` と `stella submit` でできます。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q01-01-add-tax.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q01-let-const.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

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
