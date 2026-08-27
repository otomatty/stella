---
id: 7-1-3
title: addEventListenerで処理を登録する
takeaway: "addEventListenerで、イベントが起きたときに動く関数を登録できる"
introduces: [addEventListener, イベントリスナー, 登録]
requires: [イベント, querySelector, click, アロー関数, コールバック]
header: "JavaScript入門研修"
---

<!-- _class: lead -->

# 7-1-3
# addEventListenerで処理を登録する

JavaScript入門研修 — Module 7 / レッスン7-1

<!-- ノート: この講座の山場の1つ。「ボタンを押したら動く」が初めて実現します。 -->

---

## なぜ必要か

- 要素はつかめた。イベントの名前も知っている
- あとは「この要素でこのイベントが起きたら、この処理」と結びつけるだけ
- コールバック(関数を渡す)がここで本領を発揮する

<!-- ノート: つかみ。部品(要素・イベント名・関数)が全部そろっている、と整理してから結合します。 -->

---

## 結論

**addEventListenerで、イベントが起きたときに動く関数を登録できる**

- `要素.addEventListener(イベント名, 関数)` の形
- 予約しておくことを **登録** といい、登録された関数を **イベントリスナー** と呼ぶ

<!-- ノート: 結論。リスナー=聞き耳を立てている関数、という語感で説明します。 -->

---

## 最小のコード

```html
<button>保存</button>
<script>
  const button = document.querySelector("button");
  button.addEventListener("click", () => {
    console.log("保存しました");
  });
</script>
```

<!-- ノート: 実際にクリックするたびにログが増えることを実演します。講座前半と違い、読み込み後も生きて反応し続けます。 -->

---

## 2つの定番ミス

```js
button.addEventListener(click, ...);     // 引用符忘れ
button.addEventListener("click", f());   // 関数を実行して渡している
```

- イベント名は文字列。`"click"` と引用符で囲む
- 渡すのは関数そのもの。`()` を付けない

<!-- ノート: 失敗例枠。6-2-3のカッコ問題がここで実害になる、という回収です。 -->

---

<!-- _class: summary -->

## まとめ

**addEventListenerで、イベントが起きたときに動く関数を登録できる**

<!-- ノート: 再掲のみ。「どのキーが押されたか」まで知るには?を次に残します。 -->
