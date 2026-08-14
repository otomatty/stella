---
id: 8-2-4
title: catchとfinally
takeaway: "rejectされた失敗はcatchで受け取り、finallyは成否に関わらず動く"
introduces: []
requires: [Promise, then, reject, Error, catch, finally, throw]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 8-2-4
# catchとfinally

TypeScript入門研修 — Module 8 / レッスン8-2

<!-- ノート: レッスン8-2の最後です。5-4で学んだ例外処理と、名前も考え方も揃っています。 -->

---

## なぜ必要か

- 通信は失敗する。在庫切れもある
- 失敗したまま`then`を続けると、おかしな結果が流れていく

<!-- ノート: つかみ。5-4-1で戻り値による異常通知の問題を見た。非同期でも同じで、失敗を明示的に扱う仕組みが要る。 -->

---

## 結論

**`reject`された失敗は`catch`で受け取り、`finally`は成否に関わらず動く**

- 5-4-2の`try` / `catch` / `finally`と同じ役割分担

<!-- ノート: 結論を先に言い切る。名前が揃っているのは偶然ではなく、同じ考え方を非同期に持ち込んだもの。新しい概念は増えていない。 -->

---

## 最小のコード

```ts
const order = (stock: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (stock === 0) {
      reject(new Error("在庫切れです"));
      return;
    }
    resolve("コーヒー");
  });
};
```

- `reject`には`Error`を渡すのが基本

<!-- ノート: 8-2-1で紹介したrejectの実際の使い方。5-4-1のthrowと同じく new Error(...) を渡す。rejectを呼んだあとにreturnして、resolveまで進まないようにしている点も指す。 -->

---

## 受け取る側

```ts
order(0)
  .then((item) => console.log(item))
  .catch((error) => console.log("失敗:", error.message))
  .finally(() => console.log("処理終了"));
// => "失敗: 在庫切れです"
// => "処理終了"
```

<!-- ノート: 対比枠。失敗するとthenは飛ばされ、catchへ移る。5-4-2のtry-catchとまったく同じ動き。finallyは成功でも失敗でも動く。catchの引数の型は、次のレッスンで扱う。 -->

---

<!-- _class: summary -->

## まとめ

**`reject`された失敗は`catch`で受け取り、`finally`は成否に関わらず動く**

<!-- ノート: 結論の再掲だけ。レッスン8-2はここまで。thenのチェーンも長くなると読みにくいので、もっと素直な書き方があると引きを作って締める。 -->
