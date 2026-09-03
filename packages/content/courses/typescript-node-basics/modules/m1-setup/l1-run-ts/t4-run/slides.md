---
id: 1-1-4
title: TypeScriptをNode.jsで動かす
takeaway: "tscでJavaScriptに変換してからnodeで実行するのが、動かし方の基本"
introduces: [ビルド]
requires: [tsc, コンパイル, tsconfig.json, "@types/node"]
header: "TypeScript 入門（サーバー）"
---

<!-- _class: lead -->

# 1-1-4
# TypeScriptをNode.jsで動かす

TypeScript 入門（サーバー） — Module 1 / レッスン1-1

<!-- ノート: 書いたものが動く体験まで到達させます。ここまでで環境構築は完了です。 -->

---

## なぜ必要か

- `node app.ts` は最近のNode.jsなら動いてしまう
- 動いたからといって、型が正しいとは限らない

<!-- ノート: つかみ。Node.js 22.18 以降は型注釈を取り除いて実行できますが、検査はしません。動く＝正しい、ではないと気づかせます。 -->

---

## 結論

**tscでJavaScriptに変換してからnodeで実行するのが、動かし方の基本**

- **ビルド** — 変換してから実行できる形にする作業

<!-- ノート: 結論を先に言い切ります。近年は直接実行する方法もありますが、基本の形を先に押さえます。 -->

---

## 変換してから実行する

```bash
npx tsc              # src/app.ts → dist/app.js
node dist/app.js     # 変換後のJavaScriptを実行
```

```json
"scripts": { "build": "tsc", "start": "node dist/app.js" }
```

- 手順は `npm scripts` に名前を付けて残す
- 直接実行(`node app.ts`)は型を取り除くだけで、検査はしない

<!-- ノート: Node.js 入門の npm scripts が、ここで実務的な使い道を得ます。直接実行との違い(検査するかどうか)を口頭で押さえます。 -->

---

<!-- _class: summary -->

## まとめ

**tscでJavaScriptに変換してからnodeで実行するのが、動かし方の基本**

<!-- ノート: 結論の再掲だけ。次は実行せずに検査だけする方法です。 -->
