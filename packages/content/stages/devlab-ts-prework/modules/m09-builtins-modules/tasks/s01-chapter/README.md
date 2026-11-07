# 09章 組み込みの API とモジュールの問題

同じ番号では、ドリルの問題を 1 問ずつ確認して提出してから、応用問題に進みます。

問題の一覧です。課題のパネルにも出ます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q01 | Map | 20 問 | 応用問題 |
| q02 | Set | 20 問 | 応用問題 |
| q03 | Date | 20 問 | 応用問題 |
| q04 | Error | 20 問 | 応用問題 |
| q05 | import と export | 20 問 | ★総合問題 4 問 |

## 番号ごとの説明

### q01 Map

次の20問を、Map を使って書いてください。引数と戻り値には型注釈を付けること（Map<string, number> など）。

「新しい Map を返す」問題では、引数の Map を変えないこと。引数の型は Map<…> と書く（ReadonlyMap は使わない）。

Map は、入れた順を覚えています。keys()、values()、entries() は入れた順に取り出せる。

配列にしたいときは [...map.keys()] のようにスプレッド構文を使う。

### q02 Set

次の20問を、Set を使って書いてください。引数と戻り値には型注釈を付けること（Set<string> など）。型 User は定義済みです。

引数の配列や Set を変えないこと。引数の型は string[] や Set<string> と書く（readonly や ReadonlySet は使わない）。

Set は、入れた順を覚えています。配列にしたいときは [...set] のようにスプレッド構文を使う。

Set の union や intersection などのメソッドは、このテンプレートの設定（ES2022）では使えないので、has や add を使って書く。

export type User = { id: number; name: string };

### q03 Date

次の20問を、Date を使って書いてください。引数と戻り値には型注釈を付けること。

日付はその環境の時刻（ローカル時刻）で扱う。getFullYear、getMonth、getDate、getDay、getHours、getMinutes を使う。

Date の中では、月は 0〜11（1月が 0）、曜日は 0〜6（日曜が 0）で数える。問題文の「月」は 1〜12 で書いている。

引数の Date は変えないこと。変えたいときは new Date(date.getTime()) でコピーしてから変える。

### q04 Error

次の20問を解いてください。エラーのクラス HttpError と、それを継承した NotFoundError は定義済みです。

引数と戻り値には型注釈を付けること。catch で受け取る値や、引数の error の型は unknown です。

エラーの種類は、name や message の文字列ではなく instanceof で見分ける。子のクラス（NotFoundError）は、親のクラス（HttpError）より先に確かめる。

エラーのクラスを作るときは、extends Error で継承し、constructor の中で super(message) を呼んでから this.name を設定する。

export class HttpError extends Error {

readonly status: number;

constructor(status: number, message: string) {

super(message);

this.name = "HttpError";

this.status = status;

}

}

export class NotFoundError extends HttpError {

constructor(resource: string) {

super(404, `${resource} が見つかりません`);

this.name = "NotFoundError";

}

}

### q05 import と export

次の20問を解いてください。shared/q05-modules.lib.ts（書き換えないファイル）に、定数・型・関数が用意してあります。

export の問題は、テストがこのファイルから import して確かめます。import の問題は、shared/q05-modules.lib から import して使います。

import 文は、ファイルの先頭でなくても、その問題の範囲（「// 問N」の下）に書いてかまいません。

import はどこに書いても、ファイルを読み込むときに最初に実行されます。同じ名前を2回 import しないこと（問ごとに使う名前は分けてある）。

★総合問題は 4 問です。`src/q05-modules.ts` にあるコードを 3 つのファイルに移し、`src/q05-modules.ts` には re-export だけを残します。移すとき、関数の中身は変えません。`src/q05-modules-cart.ts` だけ、数量の確かめを足します。

| ファイル | 中身 |
| --- | --- |
| `src/q05-modules-price.ts` | `TAX_RATE` と `priceWithTax` を名前付き export |
| `src/q05-modules-format.ts` | `formatYen` をデフォルト export |
| `src/q05-modules-cart.ts` | `CartItem`、`addItem`、`cartTotal`、`cartSummary`。`./q05-modules-price`、`./q05-modules-format`、`./q04-error` から import |
| `src/q05-modules.ts` | 上の 3 ファイルの re-export だけ |

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

- [サバイバルTypeScript: 発展問題 同じ取得を1回にまとめる（キャッシュ） (map)](https://typescriptbook.jp/reference/builtin-api/map)
- [サバイバルTypeScript: Set (set)](https://typescriptbook.jp/reference/builtin-api/set)
- [サバイバルTypeScript: Date (date)](https://typescriptbook.jp/reference/builtin-api/date)
- [サバイバルTypeScript: Error (error)](https://typescriptbook.jp/reference/builtin-api/error)
- [サバイバルTypeScript: 例外処理 (exception)](https://typescriptbook.jp/reference/statements/exception)
- [サバイバルTypeScript: import と export (import-export-require)](https://typescriptbook.jp/reference/import-export-require)
