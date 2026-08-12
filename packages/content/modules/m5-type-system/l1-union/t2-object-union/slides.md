---
id: 5-1-2
title: オブジェクトのユニオンは絞り込みにくい
takeaway: "オブジェクトのユニオンは、typeofでは区別できない"
introduces: []
requires: [ユニオン型, オブジェクト, 絞り込み, 型エイリアス, typeof, プロパティ, ドット記法]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 5-1-2
# オブジェクトのユニオンは絞り込みにくい

TypeScript入門研修 — Module 5 / レッスン5-1

<!-- ノート: 絞り込めば使えることは2-3-2で学びました。ところが相手がオブジェクトになると、その手が使えません。 -->

---

## なぜ必要か

- 実務のユニオン型は、たいていオブジェクト同士
  - 例: 成功したレスポンスと、失敗したレスポンス
- 次のトピックの解決策が、なぜ必要なのかを先に体感しておきたい

<!-- ノート: つかみ。APIの結果を型で表すと、必ずこの形になる。だから実務で避けて通れない。 -->

---

## 結論

**オブジェクトのユニオンは、`typeof`では区別できない**

- `typeof`はどちらも`"object"`を返す

<!-- ノート: 結論を先に言い切る。1-6-3でtypeof nullが"object"になる罠を見たが、そもそもオブジェクトは全部"object"。だから型の区別には使えない。 -->

---

## 最小のコード

```ts
type Success = { data: string };
type Failure = { message: string };

const result: Success | Failure = { data: "取得できました" };

console.log(result.data);
// エラー: Property 'data' does not exist on
// type 'Success | Failure'.
```

<!-- ノート: 5-1-1と同じ理由。dataはSuccessにしかないので、共通部分に含まれない。ではどう分ければよいのか。typeofは両方"object"を返すので使えない。 -->

---

## 共通のプロパティなら読める

```ts
type Success = { id: string; data: string };
type Failure = { id: string; message: string };

const result: Success | Failure = { id: "R-1", data: "OK" };

console.log(result.id); // OK(両方にある)
```

<!-- ノート: 対比枠。共通部分だけは読めるという5-1-1の原則がそのまま効いている。ただしidを読んでも、どちらの型なのかは分からない。読めるだけでは足りず、「見分ける」手がかりが要る。それが次のトピック。 -->

---

<!-- _class: summary -->

## まとめ

**オブジェクトのユニオンは、`typeof`では区別できない**

<!-- ノート: 結論の再掲だけ。ならば最初から見分けるための目印を付けておけばよい、と引きを作って締める。 -->
