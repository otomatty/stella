---
id: 2-2-4
title: 大文字・小文字をそろえてから比べる
takeaway: "toLowerCaseなどで表記をそろえてから比べると、揺れに強くなる"
introduces: [toLowerCase, toUpperCase, trim]
requires: [メソッド, 文字列, ===, 変換]
header: "JavaScript入門"
---

<!-- _class: lead -->

# 2-2-4
# 大文字・小文字をそろえてから比べる

JavaScript入門 — Module 2 / レッスン2-2

<!-- ノート: 「入力の揺れを吸収してから比較する」という実務の型を伝えるトピックです。 -->

---

## なぜ必要か

- 利用者は `OK` とも `ok` とも `Ok` とも入力してくる
- `===` は表記の揺れをまったく許してくれない
- 揺れたまま比べると、正しい入力を弾いてしまう

<!-- ノート: つかみ。"OK" === "ok"がfalseであることをまず見せます。 -->

---

## 結論

**toLowerCaseなどで表記をそろえてから比べると、揺れに強くなる**

- **toLowerCase** はすべて小文字に、**toUpperCase** はすべて大文字に変換した文字列を返す
- そろえてから `===` や `includes` で比べる

<!-- ノート: 結論。「比べる直前にそろえる」が型です。 -->

---

## 最小のコード

```js
const answer = "OK";
console.log(answer === "ok");                // => false
console.log(answer.toLowerCase() === "ok");  // => true
```

<!-- ノート: 元のanswer自体は変わらず、変換後の新しい文字列が返る点にも触れます。 -->

---

## 前後の空白はtrimで落とす

```js
const input = "  ok  ";
console.log(input.trim().toLowerCase());  // => "ok"
```

- **trim** は前後の空白を取り除いた文字列を返す
- メソッドはドットでつなげて続けて呼べる

<!-- ノート: 関連枠。入力値の掃除はtrim→そろえる、の順が定番です。メソッドチェーンの形もここで一度見せます。 -->

---

<!-- _class: summary -->

## まとめ

**toLowerCaseなどで表記をそろえてから比べると、揺れに強くなる**

<!-- ノート: 再掲のみ。次は「置き換える」道具だと口頭で。 -->
