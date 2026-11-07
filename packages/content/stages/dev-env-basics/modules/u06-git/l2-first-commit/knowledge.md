---
sourceRefs: [SRC-dev-env-git-init-20261107, SRC-dev-env-git-config-20261107, SRC-dev-env-gitignore-20261107, SRC-dev-env-git-add-20261107, SRC-dev-env-git-commit-20261107]
---
# 最初の記録を作るの知識問題

## 確認クイズ

### Q1. git init を初めて実行する場所はどこですか。
<!-- kind: single; skills: git-local-commit -->

- A. 課題フォルダー
- B. 学習フォルダー
- C. ダウンロード用フォルダー

<details>
<summary>解答と解説</summary>

**B** — pwd で web-training を確かめてから初期化します。

</details>

### Q2. 名前とメールを学習リポジトリだけに設定するにはどうしますか。
<!-- kind: single; skills: git-local-commit -->

- A. PC全体の設定にします
- B. リポジトリの外で実行します
- C. リポジトリの中で --global を付けずに設定します

<details>
<summary>解答と解説</summary>

**C** — git config は、ここで扱う書き方ならリポジトリだけに設定を保存します。

</details>

### Q3. git add の後に、説明を付けて記録を残す操作はどれですか。
<!-- kind: single; skills: git-local-commit -->

- A. git commit
- B. pwd
- C. git init

<details>
<summary>解答と解説</summary>

**A** — add は選ぶ操作で、commit が記録を残す操作です。

</details>

### Q4. 学習フォルダーの .gitignore に書く対象はどれですか。
<!-- kind: single; skills: git-local-commit -->

- A. 自分が書いた HTML 全部
- B. npm の部品と手元の確認結果、C# のビルド出力
- C. 学習フォルダー全体

<details>
<summary>解答と解説</summary>

**B** — 道具が作る出力を除き、学習で編集するファイルは記録します。

</details>
