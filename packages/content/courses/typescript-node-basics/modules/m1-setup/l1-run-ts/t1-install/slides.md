---
id: 1-1-1
title: TypeScriptは開発用の道具として入れる
takeaway: "TypeScriptはdevDependenciesに入れる。本番で動くのは変換後のJavaScript"
introduces: [コンパイル, tsc]
requires: [TypeScript, 型]
header: "TypeScript 入門（サーバー）"
---

<!-- _class: lead -->

# 1-1-1
# TypeScriptは開発用の道具として入れる

TypeScript 入門（サーバー） — Module 1 / レッスン1-1

<!-- ノート: Node.js 入門の devDependencies が、ここで具体例を得ます。 -->

---

## なぜ必要か

- TypeScriptをどこに入れればよいのか判断が付かない
- 本番のサーバーでも必要なのか、開発中だけなのかが分からない

<!-- ノート: つかみ。判断基準は「本番で動かすときに要るか」でした。 -->

---

## 結論

**TypeScriptはdevDependenciesに入れる。本番で動くのは変換後のJavaScript**

- **コンパイル** — TypeScriptをJavaScriptに変換すること
- **tsc** — その変換を行うコマンド

<!-- ノート: 結論を先に言い切ります。型は実行時に消える、という事実がここでも効きます。 -->

---

## 入れて、確かめる

```bash
npm install -D typescript
npx tsc --version
# => Version 5.9.3(版は入れた時期で変わる)
```

- 本番に配るのは変換後のJavaScript。TypeScript本体は要らない

<!-- ノート: npx はインストール済みの道具を実行するコマンドです。ここで一言だけ触れます。 -->

---

<!-- _class: summary -->

## まとめ

**TypeScriptはdevDependenciesに入れる。本番で動くのは変換後のJavaScript**

<!-- ノート: 結論の再掲だけ。次は変換の設定ファイルです。 -->
