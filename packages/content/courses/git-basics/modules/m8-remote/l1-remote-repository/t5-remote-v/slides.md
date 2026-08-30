---
id: 8-1-5
title: remote -vで確かめる
takeaway: "git remote -v で、どのリモートと繋がっているかを確かめる"
introduces: [remote, -v]
requires: [リモート, origin, URL, clone]
header: "Git入門"
---

<!-- _class: lead -->

# 8-1-5
# remote -vで確かめる

Git入門 — Module 8 / レッスン8-1

<!-- ノート: リモート編の現在地確認コマンドです。statusと同じで、困ったらまず確かめる系のコマンドです。 -->

---

## なぜ必要か

- 「この origin は結局どこを指しているのか」を確かめたくなる場面がある
- 似た名前のリポジトリを複数 clone していると、取り違えが起きる

<!-- ノート: 別プロジェクトのフォルダで作業していた、という取り違え事故は実際によくあります。確かめる手段が要ります。 -->

---

## 結論

**git remote -v で、どのリモートと繋がっているかを確かめる**

- 呼び名と URL の対応表が表示される
- -v は「詳しく表示する」という意味のオプション

<!-- ノート: remoteはリモートの登録を扱うコマンド。-vを付けるとURL付きで一覧できます。 -->

---

## 最小の例

```bash
git remote -v
# origin  https://github.com/sato-dev/daily-report.git (fetch)
# origin  https://github.com/sato-dev/daily-report.git (push)
```

- 2行出るが、URL が同じなら心配ない(用途別の内訳。後のレッスンで学ぶ)

<!-- ノート: 行末の括弧は受け取り用と送り用の区別ですが、今は同じURLが2行出れば正常、とだけ覚えれば十分です。 -->

---

<!-- _class: summary -->

## まとめ

**git remote -v で、どのリモートと繋がっているかを確かめる**

<!-- ノート: 結論の再掲だけ。これでリモートの準備は完了。次のレッスンでは、いよいよ手元のコミットを送ります。 -->
