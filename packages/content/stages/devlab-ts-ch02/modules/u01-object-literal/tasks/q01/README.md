# 02章 q01 オブジェクトの型

ドリルの問題を 1 問ずつ確認して提出してから、応用問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q01 | オブジェクトの型 | 20 問 | 応用問題 |

## 課題の説明

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

オブジェクトの型は { name: string; age: number } のように書く。type で名前を付けてもよい。

オブジェクトを作るときは { x: x } ではなく { x } のように、プロパティ名の省略記法を使う（ESLint でも確かめます）。

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q01-01-get-name.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q01-object-type.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: オブジェクトの型 (type-annotation-of-objects)](https://typescriptbook.jp/reference/values-types-variables/object/type-annotation-of-objects)
- [サバイバルTypeScript: オブジェクトの型 (shorthand-property-names)](https://typescriptbook.jp/reference/values-types-variables/object/shorthand-property-names)
