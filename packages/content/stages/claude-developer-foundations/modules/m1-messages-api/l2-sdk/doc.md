---
sourceRefs: [SRC-claude-docs-ts-sdk-20261031, SRC-claude-docs-api-key-20261031, SRC-claude-docs-model-ids-20261031]
---
# レッスン1-2 SDK・API キー・モデル ID

## このレッスンの目標

- [ ] 公式の SDK が送り直すエラーを言えます。
- [ ] API キーをコードに書かずに SDK へ渡せます。
- [ ] モデル ID が何を指すかを説明できます。

## 1-2-1 SDK で呼ぶ

> **API は公式の SDK から呼び、一時的なエラーの送り直しを SDK に任せます。**

SDK は、API を呼ぶための公式のライブラリーです。言語ごとに用意されていて、リクエストの組み立てと通信、送り直しを引き受けます。この講座では TypeScript の SDK を例にします。

```js
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const response = await client.messages.create(request);
```

TypeScript の SDK は、接続のエラー・408・409・429(回数の制限)・500 以上(サーバー側のエラー)を、既定で 2 回まで、間隔を少しずつ広げながら自動で送り直します。回数は `maxRetries` で変えられ、0 にすると送り直しません。HTTP の通信を自分で書くと、この送り直しも自分で書くことになります。

## 1-2-2 API キーをコードに書かない

> **API キーはコードに書かず、環境変数 ANTHROPIC_API_KEY から SDK に読ませます。**

API キーは、API を使う権限を示す秘密の文字列です。コードに書くと、コミットの履歴やログからほかの人に読まれます。公式ドキュメントは、キーを環境変数 ANTHROPIC_API_KEY に入れるよう案内しており、SDK はこの環境変数を自動で読みます。

```js
// 環境変数 ANTHROPIC_API_KEY にキーを入れておく
const client = new Anthropic(); // SDK が環境変数から読む
```

`new Anthropic({ apiKey: "sk-ant-..." })` のように、キーをそのまま書かないでください。漏れたキーは、すぐに無効にして作り直します。この講座の課題は、API キーなしで解ける形にしてあります。

## 1-2-3 モデルを ID で指す

> **モデル ID は決まったスナップショットを指し、新しい版は別の ID で出ます。**

リクエストの model には、モデル ID を書きます。スナップショットは、重みや設定を固定したモデルの版です。4.6 世代以降のモデル ID(例: `claude-opus-5-5`。2026 年 10 月時点)は日付を含まず、それ自体が 1 つのスナップショットを指します。同じ ID の中身は更新されず、新しい版は別の ID で出ます。

```js
const request = {
  model: "claude-opus-5-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: "こんにちは" }],
};
```

「同じ名前を書いておけば最新の版に切り替わる」という考えは誤りだと、公式ドキュメントは注意しています。4.6 世代より前のモデルには、最新の日付つきスナップショットを指す別名がありました。どの ID にも、それぞれ提供終了の予定があります。版を上げるときは ID を書き換え、前の版と比べてから切り替えます。

## もっと知りたい人へ

- [TypeScript SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript) — 使い方と送り直しの設定(英語)
- [Get your Claude API key](https://platform.claude.com/docs/en/get-api-key) — API キーの作り方と使い方(英語)
- [Model IDs and versioning](https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions) — モデル ID の形と版の考え方(英語)

知識問題で、このレッスンの内容を確かめます。
