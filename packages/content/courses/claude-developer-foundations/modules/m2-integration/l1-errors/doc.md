---
sourceRefs: [SRC-claude-docs-errors-20261031, SRC-claude-docs-rate-limits-20261031, SRC-claude-docs-ts-sdk-20261031]
---
# レッスン2-1 エラーと制限

## このレッスンの目標

- [ ] 送り直してよいエラーと、送り直しても通らないエラーを見分けられます。
- [ ] 間隔を広げ、回数の上限を決めた送り直しを書けます。
- [ ] request ID とレート制限のヘッダーを、調査と送る速さの調整に使えます。

## 2-1-1 送り直せるエラー

> **429 と 529 は、時間を置いて送り直すと通ることがあるエラーです。**

HTTP ステータスは、応答の結果を表す 3 けたの番号です。API のエラーには種類があり、送り直して意味があるものと、何度送っても通らないものがあります。

| ステータス | 種類 | 送り直し |
| --- | --- | --- |
| 400 | リクエストの形や中身の誤り | 直してから送る |
| 401 | API キーの誤り | キーを直してから送る |
| 429 | 組織のレート制限・利用額の上限 | 時間を置いて送り直す(上限に届いた場合は通らない) |
| 500 | Anthropic の内部のエラー | 間隔を広げて送り直す |
| 529 | API 全体が一時的に混み合っている | 時間を置いて送り直す |

429 のうち、利用段階の月の利用額の上限に届いたものは、待つ秒数を示す `retry-after` ヘッダーが付かず、上限が戻るまで送り直しても通りません。送り直しに回数の上限が要るのは、このためでもあります。

## 2-1-2 送り直しの間隔

> **送り直しは、間隔を広げながら回数の上限を決めて行います。**

混雑のエラーのあとに待たずに送り直すと、混雑を強めるだけです。間隔を倍々に広げて送り直す方法を、指数バックオフと呼びます。回数の上限を決め、上限まで送り直しても通らなければエラーとして扱います。

```js
for (let attempt = 0; attempt <= maxRetries; attempt++) {
  // 送って、送り直せるエラーなら待つ
  await sleep(baseDelayMs * 2 ** attempt);
}
```

応答に `retry-after` ヘッダーがあれば、その秒数だけ待ちます。これより早く送り直しても失敗します。公式の SDK は、接続のエラー・レート制限・5xx のエラーを、`retry-after` に従いながら指数バックオフで既定 2 回まで送り直します。自分で送り直しを書く前に、SDK の `maxRetries` の設定で足りるかを考えます。

## 2-1-3 request ID を控える

> **調査と問い合わせのために、応答の request ID を記録します。**

request ID は、リクエストごとに付く一意の ID です。すべての応答の `request-id` ヘッダーに入り、エラーの応答では本文の `request_id` にも入ります。TypeScript と Python の SDK は、応答のオブジェクトの `_request_id` で読めます。

```js
const response = await client.messages.create(request);
logger.info({ requestId: response._request_id });
```

サポートに問い合わせるときは、この ID を添えます。成功した応答とエラーの両方で、ログに残しておきます。

## 2-1-4 制限の残りを見る

> **応答のヘッダーで、レート制限の残りを確かめます。**

レート制限は、一定の時間に使える回数や量の上限です。組織の利用段階ごとに決まり、モデルの区分ごとに、1 分あたりのリクエスト数・入力トークン数・出力トークン数で測ります。

応答のレスポンスヘッダーには、上限・残り・元に戻る時刻が入ります。たとえば `anthropic-ratelimit-requests-remaining` は残りのリクエスト数、`anthropic-ratelimit-tokens-remaining` は残りのトークン数です。残りが少なくなったら送る速さを落とすと、429 を待たずに済みます。

## もっと知りたい人へ

- [Claude API errors](https://platform.claude.com/docs/en/api/errors) — エラーの種類と request ID(英語)
- [Rate limits](https://platform.claude.com/docs/en/api/rate-limits) — レート制限の決まり方とレスポンスヘッダー(英語)
- [TypeScript SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript) — SDK の送り直しの設定(英語)

知識問題で、このレッスンの内容を確かめます。単元の課題「送り直せるエラーだけを送り直す」は、課題一覧の「VS Code で開く」から取り組みます。
