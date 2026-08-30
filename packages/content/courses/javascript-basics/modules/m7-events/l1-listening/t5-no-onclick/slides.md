---
id: 7-1-5
title: onclick属性は使わない
takeaway: "HTMLのonclick属性ではなく、JavaScript側のaddEventListenerで登録する"
introduces: [onclick属性]
requires: [addEventListener, イベント, タグ, 登録, HTML]
header: "JavaScript入門"
---

<!-- _class: lead -->

# 7-1-5
# onclick属性は使わない

JavaScript入門 — Module 7 / レッスン7-1

<!-- ノート: 検索結果や古い教材で必ず出会う書き方を、明確に「使わない」と宣言するトピックです。 -->

---

## なぜ必要か

- 検索すると `<button onclick="...">` というHTMLがたくさん出てくる
- 一見短くて便利そうに見える
- なぜこの講座では使わないのか、理由ごと知っておきたい

<!-- ノート: つかみ。禁止だけでなく理由を持ち帰る回です。古い記事は今もこの形が多い、という現実から。 -->

---

## 結論

**HTMLのonclick属性ではなく、JavaScript側のaddEventListenerで登録する**

- タグの中に処理を書く **onclick属性** は使わない
- 登録はすべてJavaScript側に置く

<!-- ノート: 結論。HTML/CSS入門の「見た目の指定をHTMLに混ぜない」と同じ分担の話です。 -->

---

## 見比べる

```html
<button onclick="save()">保存</button>       <!-- 使わない -->
```

```html
<button>保存</button>
<script>
  const button = document.querySelector("button");
  button.addEventListener("click", save);   /* こちらに統一 */
</script>
```

<!-- ノート: 上のスライドは形の比較だけ。理由は次のスライドでまとめます。 -->

---

## 使わない理由

- 中身(HTML)と動き(JavaScript)が混ざり、修正箇所が散らばる
- 1要素1イベントに1つしか書けない。addEventListenerは複数登録できる
- セキュリティ設定(インライン実行の禁止)がある現場では動かない

<!-- ノート: 分担・多重登録・CSPの3点。CSPは「そういう安全設定がある」程度の粒度で十分です。 -->

---

<!-- _class: summary -->

## まとめ

**HTMLのonclick属性ではなく、JavaScript側のaddEventListenerで登録する**

<!-- ノート: 再掲のみ。次のレッスンではイベントの「伝わり方」という一段深い性質を見る、と口頭で。 -->
