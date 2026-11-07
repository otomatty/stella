# 01章 値・型・変数の問題

同じ番号では、ドリルの問題を 1 問ずつ確認して提出してから、応用問題に進みます。

問題の一覧です。課題のパネルにも出ます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q01 | letとconst | 20 問 | 応用問題 |
| q02 | 型注釈 | 20 問 | 応用問題 |
| q03 | 型推論 | 20 問 | 応用問題 |
| q04 | number型 | 20 問 | 応用問題 |
| q05 | string型 | 20 問 | 応用問題 |
| q06 | boolean型 | 20 問 | 応用問題 |
| q07 | リテラル型 | 20 問 | 応用問題 |
| q08 | any をなくす | 20 問 | ★総合問題 |

## 番号ごとの説明

### q01 letとconst

次の20個の関数の中身を書いてください。引数と戻り値の型は書いてあります。

変数は const で宣言し、後から値を入れ直す変数だけ let にすること。var は使わない。

引数に値を入れ直すことはできない（ESLint の no-param-reassign）。入れ直したいときは let の変数に写してから使う。

### q02 型注釈

次の20個の関数を書いてください。

どの関数も、引数と戻り値に型注釈を付けること。引数の数と順番は、例のとおりにする。

### q03 型推論

次の20問を解いてください。

定数は、型注釈を書かずに export const で宣言する。

関数は、引数には型注釈を書き、戻り値には型注釈を書かない（推論に任せる）。

テストは、推論された型が決められたとおりになっているかも確かめます。

### q04 number型

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

Math.round、Math.floor、Math.ceil、Math.abs、Math.sqrt、Number.isFinite、Number.parseInt などを使う。

### q05 string型

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

length、slice、includes、startsWith、endsWith、padStart、trim、toUpperCase、toLowerCase、replaceAll、indexOf などを使う。

文字列の組み立ては、+ ではなくテンプレートリテラル（`…${式}…`）で書く。

### q06 boolean型

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

どの関数も true か false を返す。条件には boolean になる式を書く（ESLint の strict-boolean-expressions）。

if 文を使わずに、return の1行で書けるものが多い。

### q07 リテラル型

次の20個の関数を書いてください。

引数と戻り値には型注釈を付けること。決まった値しか受け取らない・返さないところは、リテラル型を | でつないで書く。

例: function toggle(state: "on" | "off"): "on" | "off"

### q08 any をなくす

次の20個の関数は、引数と戻り値が any なので、型のチェックが効いていません。

すべての any を正しい型に書き換えてください。中には、any のせいで見落とされているバグがあるものもあります。

型を直すと見つかるので、あわせて直すこと。文字列を + でつないでいるところは、テンプレートリテラルに書き換える。

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

- [サバイバルTypeScript: letとconst (let-and-const)](https://typescriptbook.jp/reference/values-types-variables/let-and-const)
- [サバイバルTypeScript: letとconst (vars-problems)](https://typescriptbook.jp/reference/values-types-variables/vars-problems)
- [サバイバルTypeScript: 型注釈 (type-annotation)](https://typescriptbook.jp/reference/values-types-variables/type-annotation)
- [サバイバルTypeScript: 型推論 (type-inference)](https://typescriptbook.jp/reference/values-types-variables/type-inference)
- [サバイバルTypeScript: number型 (number)](https://typescriptbook.jp/reference/values-types-variables/number)
- [サバイバルTypeScript: string型 (string)](https://typescriptbook.jp/reference/values-types-variables/string)
- [サバイバルTypeScript: boolean型 (boolean)](https://typescriptbook.jp/reference/values-types-variables/boolean)
- [サバイバルTypeScript: boolean型 (truthy-falsy-values)](https://typescriptbook.jp/reference/values-types-variables/truthy-falsy-values)
- [サバイバルTypeScript: リテラル型 (literal-types)](https://typescriptbook.jp/reference/values-types-variables/literal-types)
- [サバイバルTypeScript: any をなくす (any)](https://typescriptbook.jp/reference/values-types-variables/any)
