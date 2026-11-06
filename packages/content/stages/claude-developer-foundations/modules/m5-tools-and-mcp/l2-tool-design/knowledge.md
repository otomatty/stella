---
sourceRefs: [SRC-claude-docs-tool-choice-20261031, SRC-claude-docs-tool-use-when-20261031, SRC-claude-docs-strict-tool-use-20261031, SRC-claude-docs-structured-considerations-20261031, SRC-anthropic-writing-tools-20261031]
---
## 知識問題

### Q1. ツールを使う性能に最も効くとされるものはどれですか？
<!-- kind: single; skills: claude-tool-design -->

- A. 詳しいツールの説明
- B. 短いツールの名前
- C. ツールの数の多さ

<details>
<summary>解答</summary>

**A** — 何をし、いつ使い、何を返すかを、3〜4 文以上を目安に書きます。

</details>

### Q2. Claude がツールを呼ばずに推測で答えてしまいます。最新のモデルで適切な対応はどれですか？
<!-- kind: single; skills: claude-tool-design -->

- A. tool_choice は auto のまま、system に「答える前に、ツールで調べてください」と書く
- B. tool_choice を none にする
- C. ツールの説明を短くする

<details>
<summary>解答</summary>

**A** — Opus 5.5・Sonnet 5.5 などでは、ツールを必ず使わせる any と tool は 400 エラーになります。

</details>

### Q3. 人数を数で受け取るツールに、文字の "2" が渡ることがあります。確実に防ぐ方法はどれですか？
<!-- kind: single; skills: claude-tool-design -->

- A. ツールの定義に strict: true を足す
- B. 説明に「数で渡してください」と書く
- C. tool_choice を any にする

<details>
<summary>解答</summary>

**A** — strict にすると、tool_use の input が必ず input_schema どおりになります。説明だけでは保証されません。

</details>

### Q4. 構造化出力と strict の説明として正しいものをすべて選んでください。
<!-- kind: multiple; skills: claude-tool-design -->

- A. 構造化出力は答えの形、strict はツールの入力の形を守らせる
- B. 両方を一緒に使える
- C. strict のスキーマでは、数の範囲(minimum)を書ける

<details>
<summary>解答</summary>

**A, B** — スキーマの決まりは構造化出力と同じで、数の範囲は書けません。

</details>

### Q5. 予定の管理に、list_users・list_events・create_event の 3 つのツールを用意しています。よりよい設計はどれですか？
<!-- kind: single; skills: claude-tool-design -->

- A. 空いている時間を探して予定を入れる schedule_event にまとめる
- B. さらに細かく分けて 10 個のツールにする
- C. 3 つの名前を同じにする

<details>
<summary>解答</summary>

**A** — 仕事の単位でまとめると、取り違えが減り、途中の結果でコンテキストを使わずに済みます。

</details>
