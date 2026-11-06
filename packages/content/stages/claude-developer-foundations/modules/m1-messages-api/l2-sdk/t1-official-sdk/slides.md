---
sourceRefs: [SRC-claude-docs-ts-sdk-20261031]
id: 1-2-1
title: SDK で呼ぶ
takeaway: "API は公式の SDK から呼び、一時的なエラーの送り直しを SDK に任せます。"
introduces: [SDK, 送り直し]
requires: [Claude API, リクエスト]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# SDK で呼ぶ
<!-- ノート: アプリから API を呼ぶ方法を確かめます。 -->
---
# 自前の通信で手が回らない
HTTP の通信を自分で書き、混雑のエラーごとに作り直しを足していました。
<!-- ノート: 送り直しの処理を毎回書くのは手間で、漏れも出ます。 -->
---
# 公式の SDK を使う
API は公式の SDK から呼び、一時的なエラーの送り直しを SDK に任せます。
<!-- ノート: SDK は、API を呼ぶための公式のライブラリーです。 -->
---
# SDK で呼ぶ
```js
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const response = await client.messages.create(request);
```
<!-- ノート: request は、これまでのトピックで組み立てたリクエストです。 -->
---
# SDK が送り直すもの
- 接続のエラー、429(回数の制限)、500 以上(サーバー側)など
- 既定では 2 回まで、間隔を少しずつ広げて送り直す
<!-- ノート: 回数は maxRetries という設定で変えられます。 -->
---
<!-- _class: summary -->
# まとめ
API は公式の SDK から呼び、一時的なエラーの送り直しを SDK に任せます。
<!-- ノート: 送り直しの考え方は、アプリへの組み込みの単元でも扱います。 -->
