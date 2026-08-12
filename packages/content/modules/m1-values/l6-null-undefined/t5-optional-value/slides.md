---
id: 1-6-5
title: 空になりうる値の型の書き方
takeaway: "空になりうる値は「string | undefined」と書く"
introduces: [strictNullChecks, strict]
requires: [ユニオン型, undefined, string, 型注釈]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 1-6-5
# 空になりうる値の型の書き方

TypeScript入門研修 — Module 1 / レッスン1-6

<!-- ノート: Module 1の最後のトピックです。ここまでに学んだユニオン型とundefinedが、1つの実用的な書き方に合流します。 -->

---

## なぜ必要か

- 「電話番号は未入力のことがある」を型で伝えたい
- `string`と書くと「必ず値がある」という嘘になってしまう

<!-- ノート: つかみ。型は仕様書でもあるので、嘘を書くと後の人が騙される。空になりうるなら、そう書くのが誠実だという価値観を伝える。 -->

---

## 結論

**空になりうる値は`string | undefined`と書く**

- 1-5-2で学んだユニオン型の、いちばん実用的な使い道

<!-- ノート: 結論を先に言い切る。新しい構文は何も出てこない。既に学んだ2つの組み合わせであることを強調すると、受講者の負担感が下がる。 -->

---

## 最小のコード

```ts
let phoneNumber: string | undefined = undefined;
phoneNumber = "090-0000-0000"; // OK
phoneNumber = 12345;
// エラー: Type 'number' is not assignable to
// type 'string | undefined'.
```

<!-- ノート: 文字列か未入力のどちらかだけを許す型。数値は弾かれる。実務のフォーム項目はほぼこの形になる、と接続する。 -->

---

## strictが空チェック漏れを止めてくれる

```ts
const phone: string | undefined = undefined;
console.log(phone.length);
// エラー: 'phone' is possibly 'undefined'.
```

- `tsconfig`の`strict`が有効だと、この確認漏れをコンパイラーが止める

<!-- ノート: 対比枠。この設定をstrictNullChecksと呼ぶ。Playgroundは既定で有効。「値があるか確かめてから使う」書き方はModule 2の条件分岐で学ぶ、tsconfigそのものはModule 9で扱う、と行き先を示して不安を残さない。 -->

---

<!-- _class: summary -->

## まとめ

**空になりうる値は`string | undefined`と書く**

<!-- ノート: 結論の再掲だけ。Module 1はこれで終了。値と型の土台ができたので、次のモジュールからは「文」でプログラムの流れを作っていくと予告して締める。 -->
