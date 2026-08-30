---
id: 9-2-3
title: ApproveとRequest changes
takeaway: "Approve は「取り込んでよい」、Request changes は「直してから」の意思表示"
introduces: [Approve, Request changes]
requires: [レビュー, PR, マージ]
header: "Git入門"
---

<!-- _class: lead -->

# 9-2-3
# ApproveとRequest changes

Git入門 — Module 9 / レッスン9-2

<!-- ノート: レビューの締めくくりとして、GitHubでレビュー結果を送るときに選ぶ2つのボタンの意味を押さえます。 -->

---

## なぜ必要か

- コメントのやりとりだけでは、「で、取り込んでいいの?」が曖昧なまま
- レビューの結論をはっきり伝える手段が要る
- GitHub のレビュー送信時には、選択肢を選ぶ欄がある

<!-- ノート: 「たぶんOKってことかな」で進めるとすれ違いが起きます。結論を明示するしくみがある、というのがこのトピックです。 -->

---

## 結論

**Approve は「取り込んでよい」、Request changes は「直してから」の意思表示**

- レビューの結論を、コメントとは別にはっきり示すためのもの
- Request changes は拒絶ではなく「修正を待っています」の合図

<!-- ノート: ApproveとRequest changesという言葉をここで導入します。どちらもレビューの結論を伝える正式な手段です。 -->

---

## 最小の例

```text
Approve          : 取り込んでよい(マージに進める)
Request changes  : ここを直してから(修正の push を待つ)
Comment          : 質問・感想だけ(結論はまだ出さない)
```

- Request changes をもらったら、修正を push して再レビューを頼む

<!-- ノート: 実際は3択で、Commentは結論を保留してやりとりを続ける選択肢です。中心はApproveとRequest changesの2つです。 -->

---

<!-- _class: summary -->

## まとめ

**Approve は「取り込んでよい」、Request changes は「直してから」の意思表示**

<!-- ノート: 結論の再掲だけ。ボタンでの意思表示のほかに、コメントへの返事の作法がもう1つあります。それを次に見ます。 -->
