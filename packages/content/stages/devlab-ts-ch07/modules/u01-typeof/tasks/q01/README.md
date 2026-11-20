# 07章 q01 typeof 型演算子

ドリルの問題を 1 問ずつ確認して提出してから、そのあとの問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q01 | typeof 型演算子 | 20 問 | 応用問題 |

## 課題の説明

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

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q01-01-default-user.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q01-typeof.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: typeof 型演算子 (typeof-type-operator)](https://typescriptbook.jp/reference/type-reuse/typeof-type-operator)
- [サバイバルTypeScript: typeof 型演算子 (indexed-access-types)](https://typescriptbook.jp/reference/type-reuse/indexed-access-types)
