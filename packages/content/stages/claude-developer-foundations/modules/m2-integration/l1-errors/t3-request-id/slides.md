---
sourceRefs: [SRC-claude-docs-errors-20261031]
id: 2-1-3
title: request ID を控える
takeaway: "調査と問い合わせのために、応答の request ID を記録します。"
introduces: [request ID]
requires: [応答, SDK]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# request ID を控える
<!-- ノート: エラーを調べるときの手がかりを残します。 -->
---
# どのリクエストか分からない
問い合わせようとしましたが、ログには時刻と「エラー」しか残っていませんでした。
<!-- ノート: どのリクエストかを特定できないと、調査が進みません。 -->
---
# request ID を記録する
調査と問い合わせのために、応答の request ID を記録します。
<!-- ノート: request ID は、リクエストごとに付く一意の ID です。 -->
---
# SDK から読む
```js
const response = await client.messages.create(request);
logger.info({ requestId: response._request_id });
```
<!-- ノート: TypeScript と Python の SDK は、応答の _request_id に ID を入れます。 -->
---
# どこに出てくるか
- すべての応答の request-id ヘッダー
- エラーの応答の本文の request_id
<!-- ノート: エラーのときも同じ ID が本文に入るので、エラーのログにも残します。 -->
---
<!-- _class: summary -->
# まとめ
調査と問い合わせのために、応答の request ID を記録します。
<!-- ノート: サポートに問い合わせるときは、この ID を添えます。 -->
