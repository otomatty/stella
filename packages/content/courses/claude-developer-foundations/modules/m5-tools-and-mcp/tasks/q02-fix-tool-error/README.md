# ツールの失敗で止まるのを直す

在庫と価格を調べるツールを持つアシスタントで、障害が起きました。ツール使用のループは、応答の `tool_use` ブロックを `src/tool-results.js` の `toToolResults(content, tools)` に渡し、返った user の発言を次のリクエストに足しています。報告とログから原因を探し、`toToolResults` を直してください。

## 障害の報告

> 10 時 42 分ごろ、在庫の API が一時的に落ちていました。その間、「A-100 の在庫と値段は？」という問い合わせに、画面が「エラーが発生しました」とだけ出して止まりました。値段は調べられるはずなのに、値段も返りませんでした。同じころ、Claude が定義していない `cancel_order` を呼んだときにも、同じように止まっていました。

```text
Error: 在庫の API に接続できません
    at get_stock (src/tools/stock.js:18:11)
    at toToolResults (src/tool-results.js:11:26)
    at runAssistant (src/assistant.js:27:23)

TypeError: tools[block.name] is not a function
    at toToolResults (src/tool-results.js:11:42)
    at runAssistant (src/assistant.js:27:23)
```

## 直したあとの動き

`toToolResults(content, tools)` は、`content` の `tool_use` ブロックを順に実行し、`{ role: "user", content: tool_result の配列 }` を返します(`tool_use` 以外のブロックは飛ばします)。

- 成功したツールは、これまでどおり `{ type: "tool_result", tool_use_id, content: 結果 }` にします。
- ツールが例外を投げたら、例外のまま止めず、`is_error: true` と、例外の内容(`Error` ならその `message`、それ以外の値ならその値)を含む文を持つ `tool_result` にします。
- `tools` にない名前のツールは、実行せずに、名前を含む文と `is_error: true` を持つ `tool_result` にします。
- 1 つのツールが失敗しても、同じ応答のほかの呼び出しは実行し、結果を元の順に返します。

求められていない書き換え(結果の形や、成功したときの動きの変更)はしません。

## 修正記録に書くこと

提出の修正記録に、次の 5 つを、自分の調べたことと直したことに即して書きます。

| 項目 | 書くこと |
| --- | --- |
| 再現の手順 | どの入力で、どう止まるのか(テストや小さな呼び出しで確かめた手順) |
| 期待する動き | 本来どう動くべきか |
| 原因 | コードのどこで、なぜ止まっていたのか |
| 直したこと | どこを、どう変えたか |
| 再発の確認 | 直ったことと、成功したときの動きが変わっていないことを、どう確かめたか |

## 確かめ方

VS Code の「STELLA: 課題を確認する」で、テスト(`tests/`)・ESLint・Prettier を実行します。いまの実装では、失敗の扱いのテストが落ちます。API キーは要りません。テストと設定のファイルは書き換えません。
