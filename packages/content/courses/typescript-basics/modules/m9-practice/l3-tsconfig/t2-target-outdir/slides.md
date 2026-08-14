---
id: 9-3-2
title: targetとoutDir
takeaway: "targetは変換後のJavaScriptの世代、outDirは出力先を決める"
introduces: [target, outDir]
requires: [tsconfig.json, コンパイル, JavaScript, モジュール]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 9-3-2
# targetとoutDir

TypeScript入門研修 — Module 9 / レッスン9-3

<!-- ノート: まず読めるようになりたい2つの項目です。現場のtsconfigを開いたとき、いちばん上のほうにあります。 -->

---

## なぜ必要か

- 9-1-5では`.ts`の隣に`.js`ができて、ファイルが混ざっていた
- 古いブラウザ向けに、変換の仕方を変えたいこともある

<!-- ノート: つかみ。ソースと生成物が同じ場所にあると、どちらを編集すればよいか分からなくなる。分ける設定が要る。 -->

---

## 結論

**`target`は変換後のJavaScriptの世代、`outDir`は出力先を決める**

- `target: "ES2022"` — 2022年版の書き方で出力する
- `outDir: "./dist"` — 変換後のファイルを`dist`に集める

<!-- ノート: 結論を先に言い切る。JavaScriptは毎年仕様が更新されている。targetを古くすると、新しい書き方が古い書き方に置き換えられて出力される。 -->

---

## targetで出力が変わる

```ts
// 書いたコード
const greet = (name: string): string => `${name}さん`;
```

```js
// target: "ES5" だと
var greet = function (name) { return name + "さん"; };
```

<!-- ノート: アロー関数もテンプレートリテラルも、ES5には存在しないので置き換えられる。1-1-4で「varは書かない」と学んだが、出力には現れることがある。読めればよい、というあのときの話につながる。 -->

---

## 迷ったときの目安

- `target` — 動かす環境が対応している中で新しいものを選ぶ
- `outDir` — 必ず設定してソースと分ける(`dist`が慣習)

<!-- ノート: 対比枠。moduleという項目もあるが、これは9-2-1のimport/exportをどう出力するかの設定。使うフレームワークが決めることが多いので、雛形のままでよい。全部を理解しようとしなくてよい、と負担を減らす。 -->

---

<!-- _class: summary -->

## まとめ

**`target`は変換後のJavaScriptの世代、`outDir`は出力先を決める**

<!-- ノート: 結論の再掲だけ。次はいちばん重要な設定を扱うと予告して締める。 -->
