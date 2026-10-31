# 費用を見積もる

長い手引きを入れたアシスタントの費用を、送る前に見積もります。`src/cost.js` の 2 つの関数を直してください。いまの実装は、単価を 100 万トークンあたりの値として扱っておらず、キャッシュの書き込みと読み込みも数えていません。

単価は引数で受け取ります。モデルの単価は変わることがあるので、実際の値は公式の料金のページで確かめます。テストの単価は教材用の例です。

## 作るもの

### `estimateCost(usage, prices, options)`

応答の `usage` と単価 `prices` から、1 回のリクエストの費用(USD)を返します。

- `prices` は 100 万トークンあたりの単価で、`input`・`output`・`cacheWrite`・`cacheRead` を持ちます。
- `usage` の値ごとに、次の単価をかけて足します。キャッシュの値が `null` か省略なら 0 とします。

  | `usage` の値 | 単価 |
  | --- | --- |
  | `input_tokens` | `input` |
  | `cache_creation_input_tokens` | `cacheWrite` |
  | `cache_read_input_tokens` | `cacheRead` |
  | `output_tokens` | `output` |

- `options.batch` が `true` なら、合計を半額にします(Message Batches API の割引は、キャッシュの料金にも重なります)。
- トークン数が 0 以上の整数でなければ、その値の名前(例: `input_tokens`)を含むメッセージの `Error` を投げます。
- 1 以上のトークン数があるのに、その単価がなければ、単価の名前(例: `cacheRead`)を含むメッセージの `Error` を投げます。

```js
estimateCost({ input_tokens: 2000, output_tokens: 500 }, { input: 2, output: 10 });
// => 0.009 (2000×2 + 500×10 を 100 万で割る)
```

### `compareCachePlans(plan, prices, options)`

同じ前半を何度も送るとき、キャッシュを使わない場合と使う場合の費用を比べます。どのリクエストも、キャッシュの期限内に、前の応答が始まってから送るものとします。

- `plan` は、前半のトークン数 `prefixTokens`、後半(質問)のトークン数 `suffixTokens`、出力のトークン数 `outputTokens`、送る回数 `requests`、キャッシュできる最低の長さ `minCacheableTokens` を持ちます。
- キャッシュを使わない場合(`withoutCache`)は、毎回、前半と後半の全部が `input_tokens` です。
- キャッシュを使う場合(`withCache`)は、1 回目は前半が書き込み、2 回目からは前半が読み込みで、後半はいつも `input_tokens` です。
- 前半が `minCacheableTokens` に届かなければ、キャッシュされません。`withCache` は `withoutCache` と同じにし、`cached` を `false` にします。届けば `cached` は `true` です。
- `saving` は `withoutCache - withCache` です(キャッシュのほうが高ければ負の数)。
- `options.batch` は、どちらの場合にも同じように効かせます。
- `requests` が 1 以上の整数でなければ、`requests` を含むメッセージの `Error` を投げます。

## 説明欄に書くこと

提出の説明欄に、`usage` の値と単価をどう対応させたか、1 回しか送らないときにキャッシュのほうが高くなる理由を、自分のコードの箇所に即して書きます。

## 確かめ方

VS Code の「STELLA: 課題を確認する」で、テスト(`tests/`)・ESLint・Prettier を実行します。API キーは要りません。テストと設定のファイルは書き換えません。

本物の応答の `usage` と公式の料金のページの単価で、実際の費用を見積もってみるのは任意です(費用がかかります)。
