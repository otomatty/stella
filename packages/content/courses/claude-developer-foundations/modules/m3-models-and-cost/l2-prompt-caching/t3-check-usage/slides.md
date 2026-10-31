---
sourceRefs: [SRC-claude-docs-caching-structure-20261031]
id: 3-2-3
title: キャッシュの効きを確かめる
takeaway: "キャッシュが効いたかは、応答の usage の値で確かめます。"
introduces: [usage, cache_read_input_tokens, cache_creation_input_tokens, input_tokens]
requires: [プロンプトキャッシュ, 応答, キャッシュの区切り]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# キャッシュの効きを確かめる
<!-- ノート: キャッシュが本当に使われているかを確かめる方法です。 -->
---
# 印を付けたのに
cache_control を付けたのに、費用が下がりません。エラーは出ていませんでした。
<!-- ノート: キャッシュされなくても、エラーにはなりません。 -->
---
# usage で確かめる
キャッシュが効いたかは、応答の usage の値で確かめます。
<!-- ノート: usage は、応答に付いてくるトークン数の内訳です。 -->
---
# 3 つの入力の値
```js
const { cache_read_input_tokens, cache_creation_input_tokens, input_tokens } =
  message.usage;
```
<!-- ノート: 読み込んだ量、書き込んだ量、区切りより後ろの量です。入力の合計は 3 つの和です。 -->
---
# どちらも 0 なら
cache_read_input_tokens と cache_creation_input_tokens がどちらも 0 なら、キャッシュされていません。
<!-- ノート: よくある理由は、前半が短すぎることです。最低の長さはモデルごとに決まっていて、Opus 5.5・Sonnet 5.5・Haiku 5.5 では 512 トークンです。 -->
---
<!-- _class: summary -->
# まとめ
キャッシュが効いたかは、応答の usage の値で確かめます。
<!-- ノート: usage は、費用の見積もりにも使えます。 -->
