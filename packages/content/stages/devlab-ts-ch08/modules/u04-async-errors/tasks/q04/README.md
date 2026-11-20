# 08章 q04 非同期のエラー処理

ドリルの問題を 1 問ずつ確認して提出してから、応用問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q04 | 非同期のエラー処理 | 20 問 | 応用問題 |

## 課題の説明

次の20問を、async・await と try・catch・finally を使って書いてください。型 Task・Result・ApiResult と関数 wait は定義済みです。

Task は「呼ぶたびに処理を始め、数値で解決するか失敗する関数」です。呼んだ回数だけ処理が走ります。

catch で受け取る値の型は unknown です。message を使うときは、error instanceof Error で確かめてから使う。

try の中で Promise を return するときは return await と書く（await がないと、その失敗は catch で捕まえられない）。

export type Task = () => Promise<number>;

export type Result = { ok: true; value: number } | { ok: false; message: string };

export type ApiResult = { ok: boolean; status: number };

ms ミリ秒待つ

export function wait(ms: number): Promise<void> {

return new Promise((resolve) => {

setTimeout(resolve, ms);

});

}

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q04-01-safe-run.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q04-async-errors.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: async と await (async)](https://typescriptbook.jp/reference/asynchronous/async)
- [サバイバルTypeScript: async と await (await)](https://typescriptbook.jp/reference/asynchronous/await)
- [サバイバルTypeScript: 例外処理 (exception)](https://typescriptbook.jp/reference/statements/exception)
