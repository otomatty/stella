---
sourceRefs: [SRC-claude-docs-api-key-20261031, SRC-claude-docs-ts-sdk-20261031]
id: 1-2-2
title: API キーをコードに書かない
takeaway: "API キーはコードに書かず、環境変数 ANTHROPIC_API_KEY から SDK に読ませます。"
introduces: [API キー, 環境変数, ANTHROPIC_API_KEY]
requires: [SDK]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# API キーをコードに書かない
<!-- ノート: API キーの渡し方を確かめます。 -->
---
# キーがリポジトリに残る
試しにコードへキーを書き、そのままコミットしてしまいました。
<!-- ノート: コミットに残ったキーは、履歴から読めてしまいます。 -->
---
# 環境変数から読む
API キーはコードに書かず、環境変数 ANTHROPIC_API_KEY から SDK に読ませます。
<!-- ノート: API キーは、API を使う権限を示す秘密の文字列です。 -->
---
# キーを渡さずに作る
```js
// 環境変数 ANTHROPIC_API_KEY にキーを入れておく
const client = new Anthropic(); // SDK が環境変数から読む
```
<!-- ノート: 公式ドキュメントは、SDK が ANTHROPIC_API_KEY を自動で読むと説明しています。 -->
---
# やってはいけない書き方
```js
const client = new Anthropic({ apiKey: "sk-ant-..." }); // キーを直書きしない
```
<!-- ノート: 漏れたキーは、すぐに無効にして作り直します。 -->
---
<!-- _class: summary -->
# まとめ
API キーはコードに書かず、環境変数 ANTHROPIC_API_KEY から SDK に読ませます。
<!-- ノート: この講座の課題は API キーなしで解けます。 -->
