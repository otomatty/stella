# 09章 q05 import と export

ドリルの問題を 1 問ずつ確認して提出してから、そのあとの問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q05 | import と export | 20 問 | ★総合問題 4 問 |

## 課題の説明

次の20問を解いてください。shared/q05-modules.lib.ts（書き換えないファイル）に、定数・型・関数が用意してあります。

export の問題は、テストがこのファイルから import して確かめます。import の問題は、shared/q05-modules.lib から import して使います。

import 文は、ファイルの先頭でなくても、その問題の範囲（「// 問N」の下）に書いてかまいません。

import はどこに書いても、ファイルを読み込むときに最初に実行されます。同じ名前を2回 import しないこと（問ごとに使う名前は分けてある）。

★総合問題は 4 問です。`src/q05-modules.ts` にあるコードを 3 つのファイルに移し、`src/q05-modules.ts` には re-export だけを残します。移すとき、関数の中身は変えません。`src/q05-modules-cart.ts` だけ、数量の確かめを足します。

| ファイル | 中身 |
| --- | --- |
| `src/q05-modules-price.ts` | `TAX_RATE` と `priceWithTax` を名前付き export |
| `src/q05-modules-format.ts` | `formatYen` をデフォルト export |
| `src/q05-modules-cart.ts` | `CartItem`、`addItem`、`cartTotal`、`cartSummary`。`./q05-modules-price`、`./q05-modules-format` から import |
| `src/q05-modules.ts` | 上の 3 ファイルから表に挙げた型・関数・定数だけを re-export |

総合問題では、q04 で書いた `ValidationError` を `src/q05-modules-cart.ts` の中でもう一度書き、名前付きで export します。

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q05-01-double.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q05-modules-price.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: import と export (import-export-require)](https://typescriptbook.jp/reference/import-export-require)
