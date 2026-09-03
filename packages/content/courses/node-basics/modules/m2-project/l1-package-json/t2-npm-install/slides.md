---
id: 2-1-2
title: npm installで道具を持ってくる
takeaway: "npm installは、必要なパッケージを取り寄せてnode_modulesに置く"
introduces: [パッケージ, node_modules, 依存関係]
requires: [npm, package.json, プロジェクト]
header: "Node.js 入門"
---

<!-- _class: lead -->

# 2-1-2
# npm installで道具を持ってくる

Node.js 入門 — Module 2 / レッスン2-1

<!-- ノート: 他人が作った部品を使う、という開発の基本動作です。 -->

---

## なぜ必要か

- 日付の整形やHTTP通信を、毎回自分で書くのは無駄が多い
- 世界中で使われている部品を、そのまま持ってきたい

<!-- ノート: つかみ。車輪の再発明という言い方を使わず、具体的な作業で示します。 -->

---

## 結論

**npm installは、必要なパッケージを取り寄せてnode_modulesに置く**

- **パッケージ** — 公開されている、再利用できるプログラムのかたまり
- **node_modules** — 取り寄せたパッケージが置かれるディレクトリ

<!-- ノート: 結論を先に言い切ります。node_modules は自動生成物で、手で触らないと添えます。 -->

---

## 入れると2か所が変わる

```bash
npm install dayjs
```

```text
package.json   → dependencies に "dayjs" が追記される(依存関係)
node_modules/  → 実体がここに置かれる(コミットしない)
```

- 何を使っているかは `package.json` を見れば分かる

<!-- ノート: node_modules を Git に入れない理由(巨大・再現できる)は doc で扱います。 -->

---

<!-- _class: summary -->

## まとめ

**npm installは、必要なパッケージを取り寄せてnode_modulesに置く**

<!-- ノート: 結論の再掲だけ。次は「同じものが入る」ことを保証する仕組みです。 -->
