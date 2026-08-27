---
id: 4-2-1
title: switchは値の一致で分岐する
takeaway: "switchは、1つの値をcaseの値と見比べて分岐する"
introduces: [switch, case, default, break]
requires: [分岐, 値, ===, if, else if]
header: "JavaScript入門研修"
---

<!-- _class: lead -->

# 4-2-1
# switchは値の一致で分岐する

JavaScript入門研修 — Module 4 / レッスン4-2

<!-- ノート: if以外の分岐その1です。「===の連続はswitchが読みやすい」が使いどころです。 -->

---

## なぜ必要か

- 「ステータスがdraftなら下書き、doneなら完了、…」
- `else if (status === ...)` が延々と並ぶと読みにくい
- 「1つの値との一致比較の連続」専用の書き方がある

<!-- ノート: つかみ。ステータスコード分岐は業務システムの頻出パターンです。 -->

---

## 結論

**switchは、1つの値をcaseの値と見比べて分岐する**

- **switch**(値) に対して **case** を並べる
- どれにも一致しないときは **default** の道に入る

<!-- ノート: 結論。比較は===と同じ厳密な一致です。 -->

---

## 最小のコード

```js
const status = "done";
switch (status) {
  case "draft": console.log("下書き"); break;
  case "done":  console.log("完了");   break;
  default:      console.log("不明");
}
```

<!-- ノート: caseの行末のbreakとセット、という形で見せています。次のスライドで理由を説明します。 -->

---

## breakを忘れると下に落ちる

- **break** は「switchをそこで抜ける」印
- 書き忘れると、次のcaseの処理まで続けて実行される
- caseごとにbreakまでで1セット、と覚える

<!-- ノート: 失敗例枠。フォールスルーは意図的に使う上級技もありますが、この講座では「必ずbreak」で統一します。 -->

---

<!-- _class: summary -->

## まとめ

**switchは、1つの値をcaseの値と見比べて分岐する**

<!-- ノート: 再掲のみ。もっと短い分岐の書き方がもう1つある、と次に残します。 -->
