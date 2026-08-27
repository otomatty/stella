---
id: 7-1-2
title: querySelectorで相手の要素を取る
takeaway: "document.querySelector()で、ページの要素を1つ取ってこられる"
introduces: [document, querySelector, セレクター]
requires: [要素, タグ, const, メソッド]
header: "JavaScript入門研修"
---

<!-- _class: lead -->

# 7-1-2
# querySelectorで相手の要素を取る

JavaScript入門研修 — Module 7 / レッスン7-1

<!-- ノート: JavaScriptとHTMLが初めてつながる瞬間です。最小限の取り方だけ扱い、深掘りはM8で行います。 -->

---

## なぜ必要か

- 「ボタンが押されたら」を予約するには、そのボタンを指す必要がある
- HTMLに書いた要素を、JavaScript側からつかみたい
- ページとコードをつなぐ入り口が要る

<!-- ノート: つかみ。HTMLとJavaScriptは別の言語なのに、どうやって橋を架けるのか?という問いです。 -->

---

## 結論

**document.querySelector()で、ページの要素を1つ取ってこられる**

- **document** = 表示中のページそのものを表す値
- **querySelector**(**セレクター**) = 指定に合う要素を1つ返すメソッド

<!-- ノート: 結論。documentは「ページの窓口」。セレクターという語はここではタグ名だけで使います。 -->

---

## 最小のコード

```html
<button>保存</button>
<script>
  const button = document.querySelector("button");
  console.log(button);  // => <button>保存</button>
</script>
```

<!-- ノート: 取れた要素がコンソールにHTMLの形で表示されることを確認します。変数に入れて使い回すのが定石です。 -->

---

## scriptが末尾にある理由の回収

- ブラウザーは上から読む。script実行時、上の要素はもう存在する
- scriptを先頭に置くと、querySelectorは `null`(見つからない)を返す
- M0で決めた「bodyの末尾」は、このための置き場所だった

<!-- ノート: 関連枠。0-1-2の伏線をここで回収します。nullは「無い」を表す値、と一言だけ添えます。 -->

---

<!-- _class: summary -->

## まとめ

**document.querySelector()で、ページの要素を1つ取ってこられる**

<!-- ノート: 再掲のみ。要素をつかめたので、いよいよ出来事の予約です、と次へ。 -->
