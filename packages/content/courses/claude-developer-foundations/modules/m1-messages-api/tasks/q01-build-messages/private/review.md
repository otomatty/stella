# レビューの観点

- `messages` を、渡された `history` を書き換えずに作っているか(`push`・`splice` で足していないか)
- 新しい発言を `role: "user"` で最後に足しているか
- `system` を `messages` に混ぜず、リクエストの一番上の階層に置いているか
- `textOf` が `type === "text"` のブロックだけを選んでいるか。`content[0]` だけを読んでいないか
- 課題で求めていない処理(入力の検証・ログの出力・API の呼び出し)を残していないか

よくある違反: `history.push` で足す、`system` を最初の user の発言としても足す、`content[0].text` だけを返す、`map((block) => block.text)` だけでテキスト以外のブロックの `undefined` を混ぜる。
