---
sourceRefs: [SRC-claude-docs-files-20261031]
id: 2-4-1
title: 何度も使うファイル
takeaway: "何度も使うファイルは、Files API に上げて ID で指します。"
introduces: [Files API, file_id]
requires: [コンテンツブロック, リクエスト]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 何度も使うファイル
<!-- ノート: 同じファイルを何度も渡すときの方法を確かめます。 -->
---
# 毎回ファイルを送り直す
同じ就業規則の PDF を、質問のたびにリクエストへ埋め込んでいました。
<!-- ノート: リクエストが大きくなり、送る手間もかかります。 -->
---
# 上げて ID で指す
何度も使うファイルは、Files API に上げて ID で指します。
<!-- ノート: Files API は、ファイルを一度上げて何度も使うための API です。 -->
---
# file_id で指す
```js
const block = {
  type: "document",
  source: { type: "file", file_id: uploadedFile.id },
};
```
<!-- ノート: 上げたときに返る file_id を、ブロックの source に書きます。 -->
---
# 気をつけること
- 上げたファイルは、ワークスペースの API キーならどれからでも読める
- 利用者から受け取った file_id をそのまま使わない
<!-- ノート: 利用者とファイルの対応は、自分のアプリで持ちます。 -->
---
<!-- _class: summary -->
# まとめ
何度も使うファイルは、Files API に上げて ID で指します。
<!-- ノート: 画像や PDF をブロックにする書き方は、次のトピックで扱います。 -->
