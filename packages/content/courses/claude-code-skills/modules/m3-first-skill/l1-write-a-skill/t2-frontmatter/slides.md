---
id: 3-1-2
title: frontmatterが入り口
takeaway: "SKILL.mdの先頭にはfrontmatterとして、名前と、いつ使うかが分かるdescriptionを書きます"
introduces: [frontmatter, 名前]
requires: [SKILL.md, description, Markdown]
header: "Skillsとサブエージェント"
---

<!-- _class: lead -->

# 3-1-2
# frontmatterが入り口

Skillsとサブエージェント — Module 3 / レッスン3-1

<!-- ノート: SKILL.mdの書き出しです。M2で学んだdescriptionが、ここで実際の形になります。 -->

---

## なぜ必要か

- descriptionが大事だと分かっても、どこに書くのかを知らない
- 書き場所が決まっていないと、Claudeが背表紙として読めない

<!-- ノート: 背表紙には決まった置き場があります。結論はまだ言いません。 -->

---

## 結論

**SKILL.mdの先頭にはfrontmatterとして、名前と、いつ使うかが分かるdescriptionを書きます**

- **frontmatter** — Markdownの先頭に `---` で挟んで書く、決まった形の情報
- **名前** — そのSkillを指す短い呼び名

<!-- ノート: frontmatterは決まり文句の枠です。この枠に入っているから、Claudeは全Skillの背表紙を一覧できます。 -->

---

## 最小の例

```text
 ---
 name: review-pr
 description: プルリクエストのレビューを頼まれたときに使う。
   観点の順番と指摘の書き方をまとめた手順書。
 ---
```

<!-- ノート: nameとdescriptionの2行だけです。descriptionは「いつ使うか+何の手順書か」の2点が入っていれば合格です。 -->

---

## 良いdescription・弱いdescription

| description | 判定 |
| --- | --- |
| 「レビューを頼まれたときに使う。観点の順番の手順書」 | いつ使うかが照らせる |
| 「レビューについて」 | いつ使うかが分からない |
| 「チームの便利メモ」 | 何のタスクかも分からない |

<!-- ノート: 失敗例枠です。書き方のコツは「〜を頼まれたときに使う」で始めること。これだけで照らせる文になります。 -->

---

<!-- _class: summary -->

## まとめ

**SKILL.mdの先頭にはfrontmatterとして、名前と、いつ使うかが分かるdescriptionを書きます**

<!-- ノート: 結論の再掲だけです。入り口ができたので、次は本文です、と口頭で締めます。 -->
