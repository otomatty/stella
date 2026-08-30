---
id: 8-3-3
title: async/awaitのエラー処理
takeaway: "awaitした処理の失敗は、try-catchでそのまま受け止められる"
introduces: []
requires: [await, async, try, catch, unknown, instanceof, Error, reject]
header: "TypeScript入門"
---

<!-- _class: lead -->

# 8-3-3
# async/awaitのエラー処理

TypeScript入門 — Module 8 / レッスン8-3

<!-- ノート: 非同期のエラー処理です。5-4で学んだ道具が、そのまま使えます。新しい記法は出てきません。 -->

---

## なぜ必要か

- `await`で書くと、`.catch()`をつなぐ場所がない
- 失敗を放置すると、プログラムが止まったり静かに壊れたりする

<!-- ノート: つかみ。thenチェーンならcatchをつなげたが、awaitは普通の代入文の形。どこでエラーを受けるのか、という素朴な疑問。 -->

---

## 結論

**`await`した処理の失敗は、`try`-`catch`でそのまま受け止められる**

- 5-4-2で学んだ書き方が、非同期でもそのまま使える

<!-- ノート: 結論を先に言い切る。rejectされたPromiseをawaitすると、例外として投げられる。だから同期処理と同じ道具で受けられる。これがasync/awaitの大きな利点。 -->

---

## 最小のコード

```ts
const order = async (stock: number): Promise<string> => {
  if (stock === 0) {
    throw new Error("在庫切れです");
  }
  return "コーヒー";
};

const main = async (): Promise<void> => {
  try {
    const item = await order(0);
    console.log(item);
  } catch (error) {
    console.log("失敗しました");
  }
};
```

<!-- ノート: async関数の中では reject の代わりに throw を書ける。受ける側は5-4-2のtry-catchそのもの。8-2-4のcatchメソッドと役割は同じだが、書き方が同期処理と揃う。 -->

---

## 失敗したらcatchへ移る

![w:950](assets/try-catch-flow.svg)

<!-- ノート: 対比枠。awaitしている行で失敗すると、その後の行は飛ばされてcatchへ移る。5-4-2で見た流れと同じ。catchの引数の型は非同期でもunknownなので、error instanceof Error で確かめてから message を読む必要がある点も、ここで口頭で補足する。 -->

---

<!-- _class: summary -->

## まとめ

**`await`した処理の失敗は、`try`-`catch`でそのまま受け止められる**

<!-- ノート: 結論の再掲だけ。最後に実際のAPI呼び出しをやってみると予告して締める。 -->
