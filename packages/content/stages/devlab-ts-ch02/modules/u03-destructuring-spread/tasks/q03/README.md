# 02章 q03 分割代入とスプレッド構文

ドリルの問題を 1 問ずつ確認して提出してから、応用問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q03 | 分割代入とスプレッド構文 | 20 問 | 応用問題 |

## 課題の説明

商品 Item と利用者 User の型は定義済みです。次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

プロパティを取り出すときは const { name, price } = item; のような分割代入を使う。

オブジェクトを変えるときは、元のオブジェクトを書き換えずに、{ ...item, price } のようにスプレッド構文で新しいオブジェクトを作る。

export type Item = { id: number; name: string; price: number; stock: number };

export type User = { id: number; name: string; age: number; email: string };

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q03-01-item-label.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q03-destructuring-spread.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: 分割代入とスプレッド構文 (destructuring-assignment-from-objects)](https://typescriptbook.jp/reference/values-types-variables/object/destructuring-assignment-from-objects)
- [サバイバルTypeScript: 分割代入とスプレッド構文 (spread-syntax-for-object)](https://typescriptbook.jp/reference/values-types-variables/object/spread-syntax-for-object)
