---
id: 7-2-2
title: getterで読み取り専用の窓口を作る
takeaway: "getを付けたメソッドは、プロパティのように読める読み取り専用の窓口になる"
introduces: [getter]
requires: [private, メソッド, this, 戻り値, ドット記法, クラス]
header: "TypeScript入門"
---

<!-- _class: lead -->

# 7-2-2
# getterで読み取り専用の窓口を作る

TypeScript入門 — Module 7 / レッスン7-2

<!-- ノート: privateで隠すと、外から値が読めなくなります。読むだけは許したい、という場面のための仕組みです。 -->

---

## なぜ必要か

- 在庫数を「表示はしたいが、書き換えさせたくない」
- 読み取り用のメソッドを作ると、かっこを付けて呼ぶことになる

<!-- ノート: つかみ。getCount() というメソッドでも解決できるが、呼び出し側では stock.getCount() となり、プロパティを読むのと書き方が変わってしまう。 -->

---

## 結論

**`get`を付けたメソッドは、プロパティのように読める読み取り専用の窓口になる**

- この仕組みをgetterと呼ぶ

<!-- ノート: 結論を先に言い切る。getterを定義する。メソッドとして定義するのに、使う側はプロパティのように書ける。内部の作りを変えても、使う側のコードを変えずに済む。 -->

---

## 最小のコード

```ts
class Stock {
  private count = 0;

  get current(): number {
    return this.count;
  }
}

const stock = new Stock();
console.log(stock.current); // => 0  (かっこは付けない)
stock.current = 10;
// エラー: Cannot assign to 'current' because it is
// a read-only property.
```

<!-- ノート: 定義では get を付けてメソッドの形、呼び出しではかっこなしのプロパティの形。読めるが書けない。3-4-3のreadonlyと似た効果を、クラスの中で実現している。 -->

---

## 計算した値も返せる

```ts
class Cart {
  private prices: number[] = [];

  get total(): number {
    let sum = 0;
    for (const price of this.prices) {
      sum = sum + price;
    }
    return sum;
  }
}
```

<!-- ノート: 対比枠。totalは実際には保持しておらず、読まれるたびに計算している。使う側は cart.total と書くだけで、中で計算されていることを知らなくてよい。合計を別のプロパティで持つと、更新漏れで食い違うが、getterならその事故が起きない。 -->

---

<!-- _class: summary -->

## まとめ

**`get`を付けたメソッドは、プロパティのように読める読み取り専用の窓口になる**

<!-- ノート: 結論の再掲だけ。作ったあと絶対に変わらない項目には、もっと直接的な指定があると引きを作って締める。 -->
