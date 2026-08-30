---
id: 5-3-4
title: neverと網羅性チェック
takeaway: "neverを使うと、分岐の書き漏れを実行前に検出できる"
introduces: [never, 網羅性チェック]
requires: [switch, 判別可能なユニオン型, 型注釈, 関数, default]
header: "TypeScript入門"
---

<!-- _class: lead -->

# 5-3-4
# neverと網羅性チェック

TypeScript入門 — Module 5 / レッスン5-3

<!-- ノート: レッスン5-3の最後です。2-4-3で「Module 5で分岐の書き漏れを検出する方法を学ぶ」と予告した、その回収です。 -->

---

## なぜ必要か

- ユニオン型に選択肢を1つ足したとき、分岐の追加を忘れる
- エラーにならないので、その選択肢だけ静かに素通りする

<!-- ノート: つかみ。実務でいちばん怖いパターン。型に "cancelled" を足しても、switchに書き足すのを忘れると、キャンセルだけ処理されない。 -->

---

## 結論

**`never`を使うと、分岐の書き漏れを実行前に検出できる**

- `never`(ネバー) = 値が存在しない型
- すべて分岐しきると、残りは`never`になる

<!-- ノート: 結論を先に言い切る。neverという言葉を定義する。「ありえない」を表す型。全部の場合を潰したあとに残るのは「ありえない値」だけ、という理屈。 -->

---

## 最小のコード

```ts
type Status = "todo" | "done";

const label = (status: Status): string => {
  switch (status) {
    case "todo":
      return "未着手";
    case "done":
      return "完了";
    default:
      const check: never = status; // 全部潰せていればOK
      return check;
  }
};
```

<!-- ノート: defaultに来る時点で、statusは全部潰されているのでnever。never型の変数にnever型の値を入れているだけなので、正常なら通る。この1行が見張り役になる。 -->

---

## 選択肢を足すと、その場でエラーになる

```ts
type Status = "todo" | "done" | "cancelled"; // 追加した
// エラー: Type '"cancelled"' is not assignable to type 'never'.
```

<!-- ノート: 対比枠。switchを直さずに型だけ足すと、defaultの1行が赤くなる。「cancelledが残っているぞ」とコンパイラーが教えてくれる。この仕掛けを網羅性チェックと呼ぶ。 -->

---

<!-- _class: summary -->

## まとめ

**`never`を使うと、分岐の書き漏れを実行前に検出できる**

<!-- ノート: 結論の再掲だけ。レッスン5-3はここまで。次は異常が起きたときの扱い方に進むと予告して締める。 -->
