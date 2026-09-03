---
id: 5-1-4
title: 失敗はtry-catchで受け止める
takeaway: "awaitの失敗はtry-catchで受け、何が起きたかを自分の言葉で伝える"
introduces: [例外, try-catch]
requires: [await, async, スタックトレース, console.log]
header: "Node.js 入門"
---

<!-- _class: lead -->

# 5-1-4
# 失敗はtry-catchで受け止める

Node.js 入門 — Module 5 / レッスン5-1

<!-- ノート: 失敗する前提で書く、という運用の考え方を渡す回です。 -->

---

## なぜ必要か

- ファイルが無い、通信できない、といった失敗は必ず起きる
- 何も書かないと、プログラムはそこで止まって終わる

<!-- ノート: つかみ。失敗は例外ではなく日常だと伝えます。 -->

---

## 結論

**awaitの失敗はtry-catchで受け、何が起きたかを自分の言葉で伝える**

- **例外** — 処理を続けられないときに投げられる知らせ
- **try-catch** — 例外を受け止めて、続きを決める書き方

<!-- ノート: 結論を先に言い切ります。握りつぶさず、伝えることが目的だと強調します。 -->

---

## 受け止めて、伝えて、終える

```js
try {
  const text = await readFile("memo.txt", "utf-8");
  console.log(text);
} catch (error) {
  console.error("memo.txt を読めませんでした");
  process.exit(1);          // 失敗として終わる
}
```

- `console.error` は標準エラー出力へ流れる

<!-- ノート: 終了ステータス 1 は CLI 講座の && と対応します。失敗を後続に伝える手段です。 -->

---

<!-- _class: summary -->

## まとめ

**awaitの失敗はtry-catchで受け、何が起きたかを自分の言葉で伝える**

<!-- ノート: 結論の再掲だけ。次のモジュールでサーバーを立てます。 -->
