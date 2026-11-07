# 07章 型の再利用とジェネリクスの問題

同じ番号では、ドリルの問題を 1 問ずつ確認して提出してから、応用問題に進みます。

問題の一覧です。課題のパネルにも出ます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q01 | typeof 型演算子 | 20 問 | 応用問題 |
| q02 | keyof 型演算子 | 20 問 | 応用問題 |
| q03 | Partial・Required・Readonly | 20 問 | 応用問題 |
| q04 | Pick と Omit | 20 問 | 応用問題 |
| q05 | Record | 20 問 | 応用問題 |
| q06 | 型変数（ジェネリクス） | 20 問 | 応用問題 |
| q07 | 型引数の制約 | 20 問 | 応用問題 |
| q08 | ジェネリクスのユーティリティ | 20 問 | ★総合問題 |

## 番号ごとの説明

### q01 typeof 型演算子

次の20問を解いてください。定数と関数は定義済みです（書き換えない）。

型の位置で typeof 定数 と書くと、その定数の型になる。(typeof 配列)[number] で配列の要素の型、(typeof オブジェクト)["キー"] でプロパティの型を取り出せる。

型を書く問題は、型を手で書き写さず、必ず typeof を使って作ること（値を直したときに型も変わるように）。

関数を書く問題は、引数と戻り値に型注釈を付けること。型注釈にも typeof を使う。

export const DEFAULT_USER = { name: "ゲスト", age: 0, admin: false };

export const ORIGIN = { x: 0, y: 0 };

export const SETTINGS = {

theme: "light",

fontSize: 14,

notifications: { email: true, push: false },

};

export const COLORS = ["red", "green", "blue"] as const;

export const LEVELS = [1, 2, 3] as const;

export const ROLE_LABELS = { admin: "管理者", member: "一般" } as const;

export const ENDPOINTS = { users: "/api/users", rooms: "/api/rooms" } as const;

export const VERSION = "1.2.3";

export const MAX_SIZE = 100;

export const TAGS = ["new", "sale"];

export function makeItem(name: string, price: number) {

return { name, price, createdAt: 0 };

}

export function handleClick(x: number, y: number): string {

return `${x},${y}`;

}

### q02 keyof 型演算子

次の20問を解いてください。型 User、Product と定数 SETTINGS、COLOR_CODES は定義済みです。

keyof 型 で、その型のプロパティ名のユニオン型になる。keyof typeof 定数 で、定数のキーのユニオン型になる。

型を書く問題は、プロパティ名を手で書き並べず、keyof を使って作ること。関数は引数と戻り値に型注釈を付けること。

export type User = { id: number; name: string; email: string; age: number };

export type Product = { code: string; price: number; stock: number };

export const SETTINGS = { theme: "light", fontSize: 14, beta: false };

export const COLOR_CODES = { red: "#ff0000", green: "#00ff00", blue: "#0000ff" } as const;

### q03 Partial・Required・Readonly

次の20問を解いてください。型 Options と Profile は定義済みです。

Partial<T> はすべてを省略できる型、Required<T> はすべてを省略できない型、Readonly<T> はすべてを読み取り専用にした型。

型を書く問題は、プロパティを手で書き並べず、ユーティリティ型で作ること。関数は引数と戻り値に型注釈を付けること。

export type Options = { size: number; color: string; bold: boolean };

export type Profile = { name: string; email?: string; age?: number };

export const DEFAULT_OPTIONS: Options = { size: 12, color: "black", bold: false };

### q04 Pick と Omit

次の20問を解いてください。型 User と Article は定義済みです。

Pick<T, "a" | "b"> は指定したプロパティだけを取り出した型、Omit<T, "a" | "b"> は指定したプロパティを除いた型。

型を書く問題は、プロパティを手で書き並べず、Pick や Omit で作ること。関数は引数と戻り値に型注釈を付けること。

Omit した型を返す関数は、返すオブジェクトに、除いたプロパティを含めないこと（テストで確かめます）。

export type User = { id: number; name: string; email: string; password: string; age: number };

export type Article = {

id: number;

title: string;

body: string;

author: string;

publishedAt: Date;

};

### q05 Record

次の20問を解いてください。型 Category と Weekday は定義済みです。

Record<Keys, Type> は、キーが Keys、値が Type のオブジェクトの型。Keys にユニオン型を渡すと、そのすべてのキーを持つ。

関数は引数と戻り値に型注釈を付けること。

export type Category = "food" | "drink" | "other";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";

### q06 型変数（ジェネリクス）

次の20問を、型変数（<T> など）を使って書いてください。any や unknown で逃げないこと。

テストは、数値の配列を渡せば number、文字列の配列を渡せば string のように、渡した型に合わせて戻り値の型が変わるかを確かめます。

引数の配列は readonly T[] にする。

### q07 型引数の制約

次の20問を、型変数を使って書いてください。any や unknown で逃げないこと。

<T extends { length: number }> は「length を持つ型だけ」、<K extends keyof T> は「T のプロパティ名だけ」、<T extends object> は「オブジェクトだけ」に限る書き方（制約）。

テストは、制約に合わない呼び出しが型エラーになることも確かめます。

### q08 ジェネリクスのユーティリティ

★総合問題（ジェネリクスのユーティリティ）で使う書き方を繰り返します。次の20個の関数を、型変数を使って書いてください。

any や unknown で逃げないこと。引数の配列は readonly T[] にし、元の配列は変えないこと。

Array の findLast や Object.groupBy などは使わず、自分で書くこと（この課題の設定では、型がないので使えない）。

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

- [サバイバルTypeScript: typeof 型演算子 (typeof-type-operator)](https://typescriptbook.jp/reference/type-reuse/typeof-type-operator)
- [サバイバルTypeScript: typeof 型演算子 (indexed-access-types)](https://typescriptbook.jp/reference/type-reuse/indexed-access-types)
- [サバイバルTypeScript: keyof 型演算子 (keyof-type-operator)](https://typescriptbook.jp/reference/type-reuse/keyof-type-operator)
- [サバイバルTypeScript: Partial・Required・Readonly (partial)](https://typescriptbook.jp/reference/type-reuse/utility-types/partial)
- [サバイバルTypeScript: Partial・Required・Readonly (required)](https://typescriptbook.jp/reference/type-reuse/utility-types/required)
- [サバイバルTypeScript: Partial・Required・Readonly (readonly)](https://typescriptbook.jp/reference/type-reuse/utility-types/readonly)
- [サバイバルTypeScript: Pick と Omit (pick)](https://typescriptbook.jp/reference/type-reuse/utility-types/pick)
- [サバイバルTypeScript: Pick と Omit (omit)](https://typescriptbook.jp/reference/type-reuse/utility-types/omit)
- [サバイバルTypeScript: Record (record)](https://typescriptbook.jp/reference/type-reuse/utility-types/record)
- [サバイバルTypeScript: 型変数（ジェネリクス） (generics)](https://typescriptbook.jp/reference/generics)
- [サバイバルTypeScript: 型変数（ジェネリクス） (type-variables)](https://typescriptbook.jp/reference/generics/type-variables)
- [サバイバルTypeScript: 型引数の制約 (type-parameter-constraint)](https://typescriptbook.jp/reference/generics/type-parameter-constraint)
