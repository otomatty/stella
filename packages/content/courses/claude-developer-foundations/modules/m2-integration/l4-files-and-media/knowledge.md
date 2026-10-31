---
sourceRefs: [SRC-claude-docs-files-20261031, SRC-claude-docs-vision-20261031, SRC-claude-docs-pdf-20261031]
---
## 知識問題

### Q1. 同じ就業規則の PDF について、何度も質問を受け付けます。適切な渡し方はどれですか？
<!-- kind: single; skills: claude-files-and-media -->

- A. Files API に一度上げ、file_id で指す
- B. 質問のたびに、PDF を base64 にして送る
- C. PDF の文字を人が書き起こして送る

<details>
<summary>解答</summary>

**A** — 何度も使うファイルは Files API に上げ、file_id で指します。

</details>

### Q2. 利用者の画面から送られてきた file_id を、そのままリクエストに使います。
<!-- kind: boolean; skills: claude-files-and-media -->

- A. 正しい
- B. 誤り

<details>
<summary>解答</summary>

**B** — 上げたファイルは同じワークスペースのキーならどれからでも読めるので、ほかの利用者のファイルを読ませてしまうおそれがあります。対応はアプリで持ちます。

</details>

### Q3. PDF を渡すブロックの type はどれですか？
<!-- kind: single; skills: claude-files-and-media -->

- A. document
- B. image
- C. text

<details>
<summary>解答</summary>

**A** — PDF は document ブロック、画像は image ブロックで渡します。

</details>

### Q4. 画像のブロックの source に使える渡し方をすべて選んでください。
<!-- kind: multiple; skills: claude-files-and-media -->

- A. base64
- B. URL
- C. Files API の file_id
- D. 画像のファイル名だけ

<details>
<summary>解答</summary>

**A, B, C** — ファイル名だけでは中身が届きません。

</details>
