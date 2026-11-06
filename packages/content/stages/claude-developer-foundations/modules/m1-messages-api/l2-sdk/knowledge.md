---
sourceRefs: [SRC-claude-docs-ts-sdk-20261031, SRC-claude-docs-api-key-20261031, SRC-claude-docs-model-ids-20261031]
---
## 知識問題

### Q1. TypeScript の SDK が既定で自動的に送り直すエラーをすべて選んでください。
<!-- kind: multiple; skills: claude-sdk-setup -->

- A. 429(回数の制限)
- B. 500 以上のサーバー側のエラー
- C. 接続のエラー
- D. 400(リクエストの形の誤り)

<details>
<summary>解答</summary>

**A, B, C** — 一時的なエラーは既定で 2 回まで送り直します。リクエストの形の誤りは、送り直しても通りません。

</details>

### Q2. API キーの渡し方として適切なものはどれですか？
<!-- kind: single; skills: claude-sdk-setup -->

- A. 環境変数 ANTHROPIC_API_KEY に入れ、SDK に読ませる
- B. ソースコードの定数に書き、コミットしておく
- C. system に書いて Claude に渡す

<details>
<summary>解答</summary>

**A** — API キーはコードに書かず、環境変数から SDK に読ませます。SDK は ANTHROPIC_API_KEY を自動で読みます。

</details>

### Q3. 4.6 世代以降のモデル ID を書いておけば、同じ ID のまま新しい版に自動で切り替わります。
<!-- kind: boolean; skills: claude-sdk-setup -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — モデル ID は決まったスナップショットを指し、新しい版は別の ID で出ます。

</details>

### Q4. 使っているモデルの新しい版が出ました。まずすることはどれですか？
<!-- kind: single; skills: claude-sdk-setup -->

- A. 新しい ID に書き換え、前の版と比べてから切り替える
- B. 何もしない(同じ ID のまま新しい版になる)
- C. ID を書かずに送り、最新の版を選ばせる

<details>
<summary>解答</summary>

**A** — 新しい版は別の ID で出るので、ID を書き換えます。切り替える前に、自分の使い方で前の版と比べます。

</details>
