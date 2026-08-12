---
id: 5-4-3
title: catchの引数はunknown
takeaway: "catchで受け取る値はunknown。使う前に確かめる必要がある"
introduces: []
requires: [catch, unknown, 型ガード, Error, 絞り込み, throw]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 5-4-3
# catchの引数はunknown

TypeScript入門研修 — Module 5 / レッスン5-4

<!-- ノート: レッスン5-4の最後です。このレッスンを5-3の直後に置いた理由が、ここで明らかになります。 -->

---

## なぜ必要か

- `catch`で受け取った値からメッセージを取り出したい
- ところが、そのまま`.message`を読むとエラーになる

<!-- ノート: つかみ。前のトピックでは「失敗しました」と固定文言を出しただけだった。実際には原因を表示したい。そこで壁にぶつかる。 -->

---

## 結論

**`catch`で受け取る値は`unknown`。使う前に確かめる必要がある**

- 投げられるのは`Error`とは限らない
- 文字列でも数値でも`throw`できてしまうため

<!-- ノート: 結論を先に言い切る。JavaScriptは何でもthrowできる仕様なので、catchする側は何が来るか分からない。だからunknownになっている。5-3-2で学んだ「分からないことを正直に表す型」がここに現れる。 -->

---

## そのままでは読めない

```ts
try {
  throw new Error("0では割れません");
} catch (error) {
  console.log(error.message);
  // エラー: 'error' is of type 'unknown'.
}
```

<!-- ノート: 5-3-2で見たのとまったく同じエラーメッセージ。unknownはそのままでは何もできない、というルールがここでも働いている。 -->

---

## 確かめてから使う

```ts
try {
  throw new Error("0では割れません");
} catch (error) {
  if (error instanceof Error) {
    console.log(error.message); // => "0では割れません"
  } else {
    console.log("不明なエラー");
  }
}
```

<!-- ノート: 対比枠。instanceofは「その種類のものか」を判定する型ガードで、Module 7のクラスで詳しく扱う。いまは「Errorかどうかを確かめる決まり文句」として覚えればよい。この形は実務でそのまま使える。 -->

---

<!-- _class: summary -->

## まとめ

**`catch`で受け取る値は`unknown`。使う前に確かめる必要がある**

<!-- ノート: 結論の再掲だけ。レッスン5-4はここまで。次は型を組み合わせる別のやり方に進むと予告して締める。 -->
