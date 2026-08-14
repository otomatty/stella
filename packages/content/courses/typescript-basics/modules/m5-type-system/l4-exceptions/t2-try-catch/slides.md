---
id: 5-4-2
title: try-catch-finally
takeaway: "tryで囲むと、投げられた例外をcatchで受け止められる"
introduces: [try, catch, finally]
requires: [throw, 例外, ブロック, Error]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 5-4-2
# try-catch-finally

TypeScript入門研修 — Module 5 / レッスン5-4

<!-- ノート: 投げられた例外を受け止める側です。3つのブロックの役割を1つずつ確認します。 -->

---

## なぜ必要か

- 例外が誰にも受け止められないと、プログラム全体が止まる
- 「失敗したら代わりの表示をする」のように、続けたい場面は多い

<!-- ノート: つかみ。エラーで画面が真っ白になるのは、受け止め損ねている状態。止まってよい場所と、止まっては困る場所を分ける必要がある。 -->

---

## 結論

**`try`で囲むと、投げられた例外を`catch`で受け止められる**

- `try` — 例外が起きるかもしれない処理
- `catch` — 起きたときの処理
- `finally` — 起きても起きなくても最後に実行

<!-- ノート: 結論を先に言い切る。3語を定義する。tryは「試す」、catchは「捕まえる」、finallyは「最後に」。中かっこはすべて2-1-1で学んだブロック。 -->

---

## 最小のコード

```ts
const divide = (a: number, b: number): number => {
  if (b === 0) {
    throw new Error("0では割れません");
  }
  return a / b;
};

try {
  console.log(divide(10, 0));
} catch (error) {
  console.log("計算に失敗しました");
}
// => "計算に失敗しました"
```

<!-- ノート: try の中で例外が起きると、その時点で残りは飛ばされ catch へ移る。プログラムは止まらず先へ進む。catch のかっこの中の error に例外の情報が入っている。 -->

---

## finallyは必ず実行される

```ts
try {
  console.log(divide(10, 0));
} catch (error) {
  console.log("失敗");
} finally {
  console.log("処理を終了します");
}
// => "失敗"
// => "処理を終了します"
```

<!-- ノート: 対比枠。成功しても失敗してもfinallyは通る。後片付け(接続を閉じる、読み込み中の表示を消す)に使う。省略も可能。 -->

---

<!-- _class: summary -->

## まとめ

**`try`で囲むと、投げられた例外を`catch`で受け止められる**

<!-- ノート: 結論の再掲だけ。ところでcatchで受け取ったerrorは、どんな型なのかという問いを残して締める。 -->
