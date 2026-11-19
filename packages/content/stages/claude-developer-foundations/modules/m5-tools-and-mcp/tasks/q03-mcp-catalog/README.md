# MCP で品目表と在庫検索を提供する

倉庫の分類表は、利用者が URI を指定して読む資料です。在庫数は、閲覧権限を持つ担当者だけが品番で検索できます。`src/catalog.js` に、この 2 つを扱う MCP サーバー側の関数を実装してください。

この演習は MCP 2026-07-28 の `tools/list`・`resources/read`・`tools/call` に対応する処理を、テストから直接呼びます。テストに渡すのは各メソッドの結果部分です。通信、認証、JSON-RPC の外側のメッセージや共通メタデータの組み立ては演習の外側で扱います。API キーや MCP サーバーの起動は不要です。

## 1. 在庫検索を一覧に出す

`listTools(scopes)` の `scopes` は、認証層が確認して渡す文字列の配列です。`"stock:read"` があれば `find_stock` だけを `tools` に載せ、なければ空の配列を返します。結果には `resultType: "complete"` を付けます。

ツールに名前・用途が伝わる `description`・`inputSchema` を書きます。引数は `sku` のみ必須のオブジェクトです。品番は英大文字 1 字、ハイフン、数字 3 桁の文字列です。スキーマの `pattern` にこの規則を書き、`additionalProperties: false` を指定します。

## 2. 分類表を読む

`readResource(uri, text)` は公開する URI `catalog://warehouse/categories` と一致したら、次の形で現在の分類表を返します。`text` はサーバーが用意した本文です。別の URI なら `Error("unknown_resource")` を投げます。

```js
readResource("catalog://warehouse/categories", "A は部品");
// => { resultType: "complete", contents: [
//   { uri: "catalog://warehouse/categories", mimeType: "text/plain", text: "A は部品" }
// ] }
```

## 3. 品番から在庫を調べる

`callTool(params, scopes, lookup)` の `params` は `{ name, arguments }` です。`lookup(sku)` は手元の台帳を読む関数で、登録済みなら 0 以上の個数、未登録なら `null` を返します。下の順で調べます。

| 条件 | 返すもの | 台帳を読む回数 |
| --- | --- | ---: |
| 閲覧権限がない | `Error("forbidden")` を投げる | 0 |
| 名前が `find_stock` 以外 | `Error("unknown_tool")` を投げる | 0 |
| 引数が未指定、品番の形式違い、余分な項目あり | `isError: true` と、`sku` をどう直すかを伝える文 | 0 |
| 品番が未登録 | `isError: true` と、どの品番を見つけられなかったかを伝える文 | 1 |
| 品番が登録済み | 品番と個数の JSON を表すテキスト | 1 |

ツールが返す結果は `{ resultType: "complete", content: [{ type: "text", text }] }` です。入力違いと未登録の場合だけ `isError: true` を加えます。例えば在庫ゼロの成功例で、`text` は `{"sku":"A-100","count":0}` です。権限は関数の第 2 引数で判定します。この演習の例外文は、呼び出し元に失敗の種類を知らせるための取り決めです。

## 確認と提出

「STELLA: 課題を確認する」を実行します。提出の説明欄に、一覧を経由せずに検索を呼んだ場合にも権限を確かめる箇所と、在庫ゼロと未登録でそれぞれ何を返したかを書いてください。

仕様の応答例は [MCP Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) と [MCP Resources](https://modelcontextprotocol.io/specification/2026-07-28/server/resources) で確認できます。
