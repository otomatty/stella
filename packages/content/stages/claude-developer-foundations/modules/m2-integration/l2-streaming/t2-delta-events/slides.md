---
sourceRefs: [SRC-claude-docs-streaming-20261031, SRC-claude-docs-streaming-deltas-20261031]
id: 2-2-2
title: 差分のイベント
takeaway: "ストリーミングでは、本文が差分のイベントとして順に届きます。"
introduces: [イベント, text_delta, message_delta]
requires: [ストリーミング, stop_reason, コンテンツブロック]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 差分のイベント
<!-- ノート: ストリーミングで届くものの形を確かめます。 -->
---
# 応答の形で読もうとした
届いたものを、普通の応答と同じ形で読もうとしました。
content も stop_reason も見つかりません。
<!-- ノート: ストリーミングでは、届くものの形が違います。 -->
---
# 差分のイベントが届く
ストリーミングでは、本文が差分のイベントとして順に届きます。
<!-- ノート: イベントは、type で種類の分かる小さな知らせです。 -->
---
# 本文の差分
```js
if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
  text += event.delta.text;
}
```
<!-- ノート: text_delta は、本文の続きの文字を運ぶ差分です。 -->
---
# 届く順番
1. message_start で始まる
2. ブロックごとに content_block_start・delta・stop
3. message_delta で stop_reason が届く
4. message_stop で終わる
<!-- ノート: 途中に ping が混ざることも、新しい種類が増えることもあるので、知らないイベントは読み飛ばします。 -->
---
<!-- _class: summary -->
# まとめ
ストリーミングでは、本文が差分のイベントとして順に届きます。
<!-- ノート: この単元の課題で、イベントの列から本文を組み立てます。 -->
