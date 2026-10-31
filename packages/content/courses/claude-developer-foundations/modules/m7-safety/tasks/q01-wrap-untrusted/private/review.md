# レビューの観点

- 外の内容を、文字列をつなげずに `JSON.stringify` しているか
- `text` に、JSON 以外の指示や説明を足していないか
- `source` のない内容をエラーにしているか
- 自分の指示を `tool_result` の中に書かず、すべての `tool_result` のあとの `text` ブロックにしているか
- 指示がないときに、空の `text` ブロックを足していないか
- 受け取ったオブジェクトと配列を書き換えていないか

よくある違反: 本文をテンプレート文字列でタグに埋め込む、`JSON.stringify(item.body)` で出どころを落とす、指示を `content` の先頭に置いて `tool_result` より前にする、`results[0].content.push(...)` で受け取った結果を書き換える。
