---
id: 2-1-1
title: modifiedの意味
takeaway: "コミット済みのファイルを編集すると modified(変更あり)になる"
introduces: [modified]
requires: [コミット, 変更, status, Untracked]
header: "Git入門"
---

<!-- _class: lead -->

# 2-1-1
# modifiedの意味

Git入門 — Module 2 / レッスン2-1

<!-- ノート: Module 2 の最初のトピックです。コミットして終わりではなく、そこから始まる日々の編集をGitがどう見ているかを押さえます。 -->

---

## なぜ必要か

- コミットしたファイルも、実務では翌日また直すことになる
- 編集してから git status を打つと、前とは違う表示が出て戸惑う

<!-- ノート: つかみ。M1ではUntrackedと表示された。今回は一度コミットしたファイルを直したらどうなるか、という場面設定です。 -->

---

## 結論

**コミット済みのファイルを編集すると modified(変更あり)になる**

- Untracked は「Gitがまだ見ていない新しいファイル」だった
- modified は「記録済みのファイルが、記録と違う」という合図

<!-- ノート: Untrackedとの対で覚えるのがコツ。どちらもstatusが教えてくれる状態の名前です。 -->

---

## 最小の例

```bash
git status
# Changes not staged for commit:
#   modified:   nippou.txt
```

- 最後のコミットと中身が違うファイルが modified と並ぶ

<!-- ノート: 日報ファイルを直した後のstatus。modifiedの行を指差しで確認します。壊れたわけではなく、変更があると教えてくれているだけです。 -->

---

<!-- _class: summary -->

## まとめ

**コミット済みのファイルを編集すると modified(変更あり)になる**

<!-- ノート: 結論の再掲だけ。ではこの変更の中身をどう確かめるのか、と問いを残して次へつなぎます。 -->
