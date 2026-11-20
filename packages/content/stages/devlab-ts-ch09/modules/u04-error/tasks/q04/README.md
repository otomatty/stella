# 09章 q04 Error

ドリルの問題を 1 問ずつ確認して提出してから、そのあとの問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q04 | Error | 20 問 | 応用問題 |

## 課題の説明

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

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q04-01-fail.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q04-error.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: Error (error)](https://typescriptbook.jp/reference/builtin-api/error)
- [サバイバルTypeScript: 例外処理 (exception)](https://typescriptbook.jp/reference/statements/exception)
