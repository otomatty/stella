---
sourceRefs: ["SRC-dev-env-local-server-20261107", "SRC-dev-env-terminal-20261107"]
---
# 起動と停止の知識問題

## 確認クイズ

### Q1. node server.mjs はどこで実行しますか。
<!-- kind: single; skills: terminal-location -->

- A. どのフォルダーでもよい
- B. ブラウザーのアドレス欄
- C. server.mjs のある課題フォルダーのターミナル

<details>
<summary>解答と解説</summary>

**C** — ターミナルの現在の場所を先に確かめます。

</details>

### Q2. 起動メッセージが出たあと、入力待ちに戻りません。どう考えますか。
<!-- kind: single; skills: local-server-run -->

- A. サーバーが起動中の通常の状態です
- B. 保存した HTML が消えています
- C. 必ず Node.js を入れ直します

<details>
<summary>解答と解説</summary>

**A** — サーバーは止めるまで処理を続けます。

</details>

### Q3. サーバーを止める操作はどれですか。
<!-- kind: single; skills: local-server-run -->

- A. ブラウザーのタブだけ閉じる
- B. 起動したターミナルで Ctrl+C を押す
- C. index.html を削除する

<details>
<summary>解答と解説</summary>

**B** — ターミナルが入力待ちへ戻ったことも確かめます。

</details>

### Q4. node server.mjs 3001 で起動したとき、開く URL はどれですか。
<!-- kind: single; skills: local-server-run -->

- A. http://localhost:3000
- B. file:///3001
- C. http://localhost:3001

<details>
<summary>解答と解説</summary>

**C** — 起動時の表示と同じ番号の URL を開きます。

</details>
