# 05章 関数の問題

同じ番号では、ドリルの問題を 1 問ずつ確認して提出してから、応用問題に進みます。

問題の一覧です。課題のパネルにも出ます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q01 | 関数宣言・関数式・アロー関数 | 20 問 | 応用問題 |
| q02 | 引数と戻り値の型、void | 20 問 | 応用問題 |
| q03 | オプション引数 | 20 問 | 応用問題 |
| q04 | デフォルト引数 | 20 問 | 応用問題 |
| q05 | 残余引数 | 20 問 | 応用問題 |
| q06 | 分割代入引数 | 20 問 | 応用問題 |
| q07 | コールバック関数 | 20 問 | 応用問題 |
| q08 | 関数を返す関数 | 20 問 | 応用問題 |
| q09 | 型ガード関数とアサーション関数 | 20 問 | 応用問題 |
| q10 | 配列のユーティリティ | 20 問 | ★総合問題 |

## 番号ごとの説明

### q01 関数宣言・関数式・アロー関数

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

書き方（関数宣言・関数式・アロー関数）は、問題のコードに用意してある形のまま使う。引数、型、中身を書き足す。

アロー関数は、中身が1つの式なら (n: number): number => n * 2 のように { } と return を省略できる。

### q02 引数と戻り値の型、void

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

何も返さない関数の戻り値の型は void。引数で受け取った配列やオブジェクトを書き換える関数は、引数を readonly にしない。

配列やオブジェクトは参照渡しなので、関数の中で書き換えると、呼び出し側の値も変わる。

### q03 オプション引数

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

「省略できる」と書いた引数は、title?: string のように ? を付ける。省略されると undefined になるので、?? や === undefined で扱う。

デフォルト引数（= 値）は使わず、? で書くこと（デフォルト引数は q04 で扱う）。

### q04 デフォルト引数

次の20個の関数を書いてください。

「省略したら◯◯」と書いた引数は、times = 2 のようにデフォルト引数で書く。デフォルト値を書いた引数には型注釈を書かない（値から推論される。ESLint の no-inferrable-types）。

それ以外の引数と戻り値には型注釈を付けること。

### q05 残余引数

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

いくつでも受け取れる引数は ...numbers: number[] のように書く（残余引数）。残余引数は最後の引数にしか書けない。

「1つ以上」の問題は、1つ目を普通の引数にし、残りを残余引数にする（引数なしの呼び出しが型エラーになる）。

### q06 分割代入引数

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

引数の位置で分割代入して受け取る。例: function area({ width, height }: { width: number; height: number }) { … }

「省略したら◯◯」と書いたプロパティは、型では ? を付け、分割代入のところでデフォルト値を書く（{ x = 0 }: { x?: number }）。

配列やタプルも分割代入で受け取れる（[first]: readonly string[]）。

### q07 コールバック関数

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

関数を受け取る引数の型は (n: number) => number のように書く。

中では map、filter、find、some、every、reduce などを使わず、for-of や for で回して、受け取った関数を自分で呼ぶこと。

### q08 関数を返す関数

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

関数を返す関数の戻り値の型は (x: number) => number のように書く。

返した関数の中から、外側の関数の変数（let で宣言したもの）を読み書きできる。呼ぶたびに値が残るのは、そのため（クロージャ）。

### q09 型ガード関数とアサーション関数

次の20個の関数を書いてください。型 User、Admin、Pet は定義済みです。

「型ガード関数」は戻り値の型を value is string のように書く。true を返したとき、呼び出し側で value がその型に絞り込まれる。

「アサーション関数」は戻り値の型を asserts value is string のように書き、条件に合わなければ例外を投げる。

テストは、戻り値の型が型ガードやアサーションになっているかも確かめる。

export type User = { name: string; age: number };

export type Admin = User & { role: "admin" };

export type Pet = { kind: "dog"; bark: string } | { kind: "cat"; meow: string };

### q10 配列のユーティリティ

★総合問題（配列のユーティリティ）で使う書き方を繰り返します。生徒を表す型 Student は定義済みです。

次の20個の関数を書いてください。引数の配列は readonly Student[] にし、元の配列や生徒のオブジェクトは変えないこと。引数と戻り値には型注釈を付けること。

map、filter、some、every、find、sort（コピーしてから）などを使ってよい。

export type Student = { name: string; grade: number; score: number };

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

- [サバイバルTypeScript: 関数宣言・関数式・アロー関数 (function-declaration)](https://typescriptbook.jp/reference/functions/function-declaration)
- [サバイバルTypeScript: 関数宣言・関数式・アロー関数 (function-expression)](https://typescriptbook.jp/reference/functions/function-expression)
- [サバイバルTypeScript: 関数宣言・関数式・アロー関数 (arrow-functions)](https://typescriptbook.jp/reference/functions/arrow-functions)
- [サバイバルTypeScript: 引数と戻り値の型、void (function-parameters)](https://typescriptbook.jp/reference/functions/function-parameters)
- [サバイバルTypeScript: 引数と戻り値の型、void (void-type)](https://typescriptbook.jp/reference/functions/void-type)
- [サバイバルTypeScript: 引数と戻り値の型、void (pass-by-value)](https://typescriptbook.jp/reference/functions/pass-by-value)
- [サバイバルTypeScript: オプション引数 (optional-parameters)](https://typescriptbook.jp/reference/functions/optional-parameters)
- [サバイバルTypeScript: デフォルト引数 (default-parameters)](https://typescriptbook.jp/reference/functions/default-parameters)
- [サバイバルTypeScript: 残余引数 (rest-parameters)](https://typescriptbook.jp/reference/functions/rest-parameters)
- [サバイバルTypeScript: 分割代入引数 (destructuring-assignment-parameters)](https://typescriptbook.jp/reference/functions/destructuring-assignment-parameters)
- [サバイバルTypeScript: 分割代入引数 (keyword-arguments-and-options-object-pattern)](https://typescriptbook.jp/reference/functions/keyword-arguments-and-options-object-pattern)
- [サバイバルTypeScript: コールバック関数 (callback-functions)](https://typescriptbook.jp/reference/functions/callback-functions)
- [サバイバルTypeScript: コールバック関数 (function-type-declaration)](https://typescriptbook.jp/reference/functions/function-type-declaration)
- [サバイバルTypeScript: 関数を返す関数 (function-is-a-value)](https://typescriptbook.jp/reference/functions/function-is-a-value)
- [サバイバルTypeScript: 型ガード関数とアサーション関数 (type-guard-functions)](https://typescriptbook.jp/reference/functions/type-guard-functions)
- [サバイバルTypeScript: 型ガード関数とアサーション関数 (assertion-functions)](https://typescriptbook.jp/reference/functions/assertion-functions)
- [サバイバルTypeScript: 配列を壊さない操作 (array-operations)](https://typescriptbook.jp/reference/values-types-variables/array/array-operations)
