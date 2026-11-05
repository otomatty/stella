# レビューの観点

- 分類の結果の前後の空白・大文字と小文字・末尾の句読点をそろえているか
- そろえた値が、決めた種類と完全に一致するときだけ受け付けているか(`includes` を部分一致に使っていないか)
- 当てはまらない分類を `fallback` に回し、`fellBack` で示しているか
- `fallback` が `routes` にないとき、送る前に名前を含むエラーにしているか
- 行き先の `model`・`max_tokens`・`system` でリクエストを作っているか(`maxTokens` のまま送っていないか)
- `classify` と `send` を 1 回ずつ呼んでいるか
- 説明欄が、そろえる理由と当てはまらない分類の扱いを、自分のコードに即して述べているか

よくある違反: 分類の文字列を `routes[label]` で直接引いて `undefined` で止まる、`label.includes("billing")` のような部分一致で「billing and technical」を請求に回す、`system` を送らない、当てはまらない分類で例外にする。
