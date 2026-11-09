# 02章 オブジェクト・配列・タプルの問題

同じ番号では、ドリルの問題を 1 問ずつ確認して提出してから、応用問題に進みます。

問題の一覧です。課題のパネルにも出ます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q01 | オブジェクトの型 | 20 問 | 応用問題 |
| q02 | オプションプロパティと readonly | 20 問 | 応用問題 |
| q03 | 分割代入とスプレッド構文 | 20 問 | 応用問題 |
| q04 | 配列の型 | 20 問 | 応用問題 |
| q05 | 配列を壊さない操作 | 20 問 | 応用問題 |
| q06 | タプル | 20 問 | 応用問題 |
| q07 | 構造的型付け | 20 問 | 応用問題 |
| q08 | インデックス型 | 20 問 | ★総合問題 |

## 番号ごとの説明

### q01 オブジェクトの型

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

オブジェクトの型は { name: string; age: number } のように書く。type で名前を付けてもよい。

オブジェクトを作るときは { x: x } ではなく { x } のように、プロパティ名の省略記法を使う（ESLint でも確かめます）。

### q02 オプションプロパティと readonly

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

なくてもよいプロパティは nickname?: string のように ? を付ける。書き換えさせないプロパティには readonly を付ける。

オプションプロパティの値は undefined かもしれないので、?? や !== undefined で扱う。

### q03 分割代入とスプレッド構文

商品 Item と利用者 User の型は定義済みです。次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

プロパティを取り出すときは const { name, price } = item; のような分割代入を使う。

オブジェクトを変えるときは、元のオブジェクトを書き換えずに、{ ...item, price } のようにスプレッド構文で新しいオブジェクトを作る。

export type Item = { id: number; name: string; price: number; stock: number };

export type User = { id: number; name: string; age: number; email: string };

### q04 配列の型

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

引数の配列は、関数の中で書き換えないので readonly number[] や readonly string[] にする。戻り値の配列は number[] などでよい。

for-of、map、filter、includes、indexOf、join、every などを使う。

配列の要素を numbers[0] のように取り出すと、型は number | undefined になる（要素がないかもしれないため）。

### q05 配列を壊さない操作

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

引数の配列は readonly にし、元の配列を書き換えずに、新しい配列を作って返す。

[...items, item]、slice、filter、map を使う。sort や reverse は元の配列を書き換えるので、[...items] でコピーしてから使う。

### q06 タプル

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

決まった数の要素を決まった順に並べる配列は、[number, number] のようなタプル型にする。

要素を取り出すときは const [x, y] = point; のような配列の分割代入を使うと読みやすい。

### q07 構造的型付け

Cat、Dog、Robot など、いくつかの型は定義済みです。次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

引数の型には、関数が本当に使うプロパティだけを書く（例: 名前しか使わないなら { name: string }）。

そうすると、名前の違う型でも、そのプロパティを持っていれば渡せる。これが構造的型付け。

export type Cat = { name: string; age: number; meow: string };

export type Dog = { name: string; age: number; breed: string };

export type Robot = { name: string; version: number };

export type Box = { width: number; height: number; depth: number };

export type Paper = { width: number; height: number };

export type Product = { name: string; price: number; stock: number };

export type Service = { name: string; price: number; hours: number };

### q08 インデックス型

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

キーが自由な文字列で、値の型が決まっているオブジェクトは { [name: string]: number } のようなインデックス型にする。

scores[name] のように取り出した値は、そのキーがないかもしれないので number | undefined になる。?? や !== undefined で扱う。

すべてのキーや値を順に見るときは Object.keys、Object.values、Object.entries を使う。オブジェクトを変えるときは、新しいオブジェクトを作って返す。

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
