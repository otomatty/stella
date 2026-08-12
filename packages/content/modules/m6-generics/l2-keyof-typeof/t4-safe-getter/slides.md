---
id: 6-2-4
title: インデックスアクセス型と安全な読み取り
takeaway: "「型[キー]」でプロパティの型を取り出すと、戻り値の型まで正確になる"
introduces: [インデックスアクセス型]
requires: [keyof, typeof型演算子, ジェネリック関数, 型引数の制約, 戻り値]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 6-2-4
# インデックスアクセス型と安全な読み取り

TypeScript入門研修 — Module 6 / レッスン6-2

<!-- ノート: レッスン6-2の最後です。ここまでの道具を合流させて、実務で使える形にします。Module 6の到達点です。 -->

---

## なぜ必要か

- 設定を名前で読み取る関数を書きたい
- キーは`keyof`で縛れるが、戻り値の型が値ごとに違う

<!-- ノート: つかみ。envならstring、portならnumberを返したい。戻り値をstring | numberにすると、使う側で毎回絞り込みが必要になって不便。 -->

---

## 結論

**`型[キー]`でプロパティの型を取り出すと、戻り値の型まで正確になる**

- この書き方をインデックスアクセス型と呼ぶ

<!-- ノート: 結論を先に言い切る。3-1-2の配列アクセスと同じ角かっこだが、こちらは型の位置に書く。型からプロパティの型を取り出す。 -->

---

## 最小のコード

```ts
const config = { env: "production", port: 3000 };
type Config = typeof config;

const get = <K extends keyof Config>(key: K): Config[K] => {
  return config[key];
};
```

<!-- ノート: Kはキーの型引数で、keyof Configに制約されている。戻り値の Config[K] が「そのキーに対応する型」。6-1-4の制約と6-2-2のkeyofがここで合流する。 -->

---

## タイポも戻り値も実行前に守られる

```ts
const env = get("env"); // 型は string
const port = get("port"); // 型は number

get("envv");
// エラー: Argument of type '"envv"' is not assignable
// to parameter of type '"env" | "port"'.
```

<!-- ノート: 対比枠。キーごとに戻り値の型が変わっている点が肝。Playgroundで両方にカーソルを乗せて確認させる。タイポは候補が並んだメッセージで弾かれる。 -->

---

<!-- _class: summary -->

## まとめ

**`型[キー]`でプロパティの型を取り出すと、戻り値の型まで正確になる**

<!-- ノート: 結論の再掲だけ。レッスン6-2はここまで。こうした型の加工は、実は標準で用意されていると引きを作って締める。 -->
