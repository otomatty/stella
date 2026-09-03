---
id: 3-1-3
title: 省略できる引数は?を付ける
takeaway: "引数名の後ろに?を付けると省略でき、その中ではundefinedの可能性を扱う"
introduces: [省略可能な引数]
requires: [引数, ユニオン型, undefined, 戻り値]
header: "TypeScript 入門（サーバー）"
---

<!-- _class: lead -->

# 3-1-3
# 省略できる引数は?を付ける

TypeScript 入門（サーバー） — Module 3 / レッスン3-1

<!-- ノート: 省略可能にした瞬間、中で undefined を扱う責任が生まれる、という因果を教えます。 -->

---

## なぜ必要か

- 同じ関数を、引数ありと無しの両方で呼びたい
- 呼び出し側に毎回 `undefined` を書かせるのは不便

<!-- ノート: つかみ。既定値のある処理を書きたい場面です。 -->

---

## 結論

**引数名の後ろに?を付けると省略でき、その中ではundefinedの可能性を扱う**

- **省略可能な引数** — `名前?: 型` と書く。渡されなければ `undefined`

<!-- ノート: 結論を先に言い切ります。便利さと引き換えに、中で確認が要ると伝えます。 -->

---

## 省略できる分、中で確認する

```ts
function greet(name: string, title?: string): string {
  if (title === undefined) {
    return name + " さん";
  }
  return name + " " + title.trim();
}

greet("佐藤");            // OK
greet("佐藤", "部長");     // OK
```

<!-- ノート: 確認を省くと title.trim() のところで strict がエラーにします。逆に、つなぐだけなら型は止めてくれず「佐藤 undefined」が出ます。値として使う形で書くのがコツです。 -->

---

<!-- _class: summary -->

## まとめ

**引数名の後ろに?を付けると省略でき、その中ではundefinedの可能性を扱う**

<!-- ノート: 結論の再掲だけ。次は返す値が無い関数です。 -->
