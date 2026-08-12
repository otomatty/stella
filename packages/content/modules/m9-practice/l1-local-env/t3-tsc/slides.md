---
id: 9-1-3
title: tscでコンパイルする
takeaway: "tscはTypeScriptをJavaScriptに変換するコマンド"
introduces: [tsc]
requires: [コンパイル, Node.js, ターミナル, JavaScript, TypeScript, npm]
header: "TypeScript入門研修"
---

<!-- _class: lead -->

# 9-1-3
# tscでコンパイルする

TypeScript入門研修 — Module 9 / レッスン9-1

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

<!-- ノート: 結論を先に言い切る。0-1-2で「コンパイラー」という言葉を定義したが、その実体がこのコマンド。npmで導入する(npmは次のレッスンで扱うので、いまは手順として実行してもらう)。 -->

---

## 実行してみる

```bash
npm install --save-dev typescript
npx tsc index.ts
```

- `index.ts` から `index.js` が作られる
- 中身を開くと、型注釈が消えている

<!-- ノート: 出力されたjsファイルを実際に開いてもらう。0-1-3の図で見たことが、目の前で起きている。npxはインストールしたコマンドを実行する命令、とだけ説明する。 -->

---

## 実行する

```bash
node index.js
```

- 変換後のJavaScriptを、Node.jsで動かす

<!-- ノート: 対比枠。書く(.ts) → 変換する(tsc) → 動かす(node)という3ステップ。Playgroundでは1つのボタンに隠れていた流れが、手元では明示的になる。毎回2つのコマンドを打つのは面倒なので、実務では設定ファイルで簡略化する。それが次のレッスン以降の話。 -->

---

<!-- _class: summary -->

## まとめ

**`tsc`はTypeScriptをJavaScriptに変換するコマンド**

<!-- ノート: 結論の再掲だけ。レッスン9-1はここまで。次はファイルを分ける方法に進むと予告して締める。 -->
