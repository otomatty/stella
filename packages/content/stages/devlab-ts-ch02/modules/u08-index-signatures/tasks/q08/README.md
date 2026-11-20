# 02章 q08 インデックス型

ドリルの問題を 1 問ずつ確認して提出してから、★総合問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q08 | インデックス型 | 20 問 | ★総合問題 |

## 課題の説明

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

キーが自由な文字列で、値の型が決まっているオブジェクトは { [name: string]: number } のようなインデックス型にする。

scores[name] のように取り出した値は、そのキーがないかもしれないので number | undefined になる。?? や !== undefined で扱う。

すべてのキーや値を順に見るときは Object.keys、Object.values、Object.entries を使う。オブジェクトを変えるときは、新しいオブジェクトを作って返す。

総合問題では、q04 で書いた `sum` を `src/q08-inventory.ts` の中でもう一度書きます。

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q08-01-score-of.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q08-inventory.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: インデックス型 (index-signature)](https://typescriptbook.jp/reference/values-types-variables/object/index-signature)
- [サバイバルTypeScript: インデックス型 (how-to-loop-an-object)](https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object)
