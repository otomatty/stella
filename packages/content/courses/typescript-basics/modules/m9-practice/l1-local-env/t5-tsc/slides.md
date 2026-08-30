---
id: 9-1-5
title: tscでコンパイルする
takeaway: "tscはTypeScriptをJavaScriptに変換するコマンド"
introduces: [tsc]
requires: [コンパイル, Node.js, ターミナル, JavaScript, TypeScript, npm, npx]
header: "TypeScript入門"
---

<!-- _class: lead -->

# 9-1-5
# tscでコンパイルする

TypeScript入門 — Module 9 / レッスン9-1

<!-- ノート: レッスン9-1の最後です。0-1-3で学んだ「変換されて動く」を、自分の手で実行します。 -->

---

## なぜ必要か

- Playgroundの「.JS」タブが自動でやっていたことを、自分で行う必要がある
- 変換しなければ、Node.jsもブラウザもコードを実行できない

<!-- ノート: つかみ。0-1-3で見た「TypeScriptはJavaScriptに変換されてから動く」を、手元で再現する。仕組みが腹落ちする瞬間。 -->

---

## 結論

**`tsc`はTypeScriptをJavaScriptに変換するコマンド**

- tsc = TypeScript Compiler の略

<!-- ノート: 結論を先に言い切る。0-1-2で「コンパイラー」という言葉を定義したが、その実体がこのコマンド。 -->

---

## 変換する

```bash
npx tsc index.ts
```

- `index.ts` から `index.js` が作られる
- 中身を開くと、型注釈が消えている

<!-- ノート: 先に index.ts を作ってから tsc する。中身の例はdoc/演習に書く。出力されたjsを実際に開いてもらう。0-1-3の図で見たことが、目の前で起きている。npxは前のトピックで導入済み。 -->
---

## 動かす

```bash
node index.js
```

- 書く(`.ts`) → 変換する(`tsc`) → 動かす(`node`)

<!-- ノート: 対比枠。Playgroundでは1つのボタンに隠れていた流れが、手元では明示的になる。毎回手打ちは面倒なので、実務では設定ファイルで簡略化する。それが次のレッスン以降の話。 -->

---

<!-- _class: summary -->

## まとめ

**`tsc`はTypeScriptをJavaScriptに変換するコマンド**

<!-- ノート: 結論の再掲だけ。レッスン9-1はここまで。次はファイルを分ける方法に進むと予告して締める。 -->
