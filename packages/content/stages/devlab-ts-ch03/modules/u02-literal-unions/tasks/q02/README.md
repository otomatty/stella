# 03章 q02 リテラル型のユニオン

ドリルの問題を 1 問ずつ確認して提出してから、応用問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q02 | リテラル型のユニオン | 20 問 | 応用問題 |

## 課題の説明

次の20問を解いてください。引数と戻り値には型注釈を付けること。

問1〜10 は、定義済みの型 Direction、Weekday、Plan を使う。

問11〜20 は、"表" | "裏" のようなリテラル型のユニオンに type で名前を付けて export し、その型を使って関数を書く。

文字列から型の値に変える関数（parse…）は、どれにも当てはまらなければ undefined を返す。

export type Direction = "up" | "down" | "left" | "right";

export type Weekday = "月" | "火" | "水" | "木" | "金";

export type Plan = "free" | "pro" | "enterprise";

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q02-01-turn-right.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q02-literal-union.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: リテラル型 (literal-types)](https://typescriptbook.jp/reference/values-types-variables/literal-types)
