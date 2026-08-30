---
id: 5-1-5
title: breakとcontinueで流れを変える
takeaway: "breakはループ全体を抜け、continueはその回だけ飛ばす"
introduces: [continue]
requires: [ループ, break, if, for...of]
header: "JavaScript入門"
---

<!-- _class: lead -->

# 5-1-5
# breakとcontinueで流れを変える

JavaScript入門 — Module 5 / レッスン5-1

<!-- ノート: switchで学んだbreakがループでも使える、という再会のトピックです。 -->

---

## なぜ必要か

- 「見つかったら、そこで探すのをやめたい」
- 「空の行だけ飛ばして、続きは処理したい」
- 全周を律儀に回るだけでは足りない場面がある

<!-- ノート: つかみ。検索の打ち切りとスキップ、2つの場面を並べます。 -->

---

## 結論

**breakはループ全体を抜け、continueはその回だけ飛ばす**

- **break** — switchと同じ「そこで抜ける」。以降の周回ごと終了
- **continue** — その周の残りを飛ばして、次の周へ進む

<!-- ノート: 結論。「全部やめる」と「今回だけやめる」の対比で覚えます。 -->

---

## 最小のコード

```js
const inputs = ["佐藤", "", "鈴木"];
for (const name of inputs) {
  if (name === "") {
    continue;  // 空の入力は飛ばす
  }
  console.log(`${name}さん`);
}
```

<!-- ノート: 空文字スキップの定番パターン。""の周だけconsole.logが実行されません。 -->

---

## breakの例: 見つけたら終了

```js
const members = ["佐藤", "鈴木", "高橋"];
for (const member of members) {
  console.log(`確認: ${member}`);
  if (member === "鈴木") {
    break;  // 見つけたので打ち切り
  }
}
```

<!-- ノート: 高橋の周は実行されない、を確認します。無駄な周回を省くのがbreakの実務価値です。 -->

---

<!-- _class: summary -->

## まとめ

**breakはループ全体を抜け、continueはその回だけ飛ばす**

<!-- ノート: 再掲のみ。繰り返す「処理」自体に名前を付けて再利用する、次のモジュール(関数)への期待を残します。 -->
