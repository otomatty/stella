---
sourceRefs: [SRC-dev-env-git-diff-20261107, SRC-dev-env-git-log-20261107]
---
# 変更を読むの知識問題

## 確認クイズ

### Q1. 記録済みのファイルを変えて保存しました。add の前に差分を見る操作はどれですか。
<!-- kind: single; skills: git-local-commit -->

- A. git init
- B. git diff
- C. git log --oneline

<details>
<summary>解答と解説</summary>

**B** — git diff は、まだ add していない変更を表示します。

</details>

### Q2. git log --oneline で先頭に出るのはどの記録ですか。
<!-- kind: single; skills: git-local-commit -->

- A. 一番古い記録
- B. 未保存の変更
- C. 一番新しい記録

<details>
<summary>解答と解説</summary>

**C** — 新しい記録から順に並ぶため、直近の説明を先頭で確認できます。

</details>

### Q3. add の後に git diff が空になりました。何を確かめますか。
<!-- kind: single; skills: git-local-commit -->

- A. git status と git diff --cached で、選んだ状態を確認します
- B. コミット済みだと決めます
- C. ファイルを削除します

<details>
<summary>解答と解説</summary>

**A** — 引数なしの diff に出ないだけで、選んだ変更が残っていることがあります。

</details>
