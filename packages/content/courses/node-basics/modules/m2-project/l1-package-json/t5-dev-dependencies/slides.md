---
id: 2-1-5
title: 開発だけで使う道具は分けて入れる
takeaway: "本番でも要るものはdependencies、開発中だけ要るものはdevDependenciesに入れる"
introduces: [devDependencies]
requires: [依存関係, npm, パッケージ, package.json]
header: "Node.js 入門"
---

<!-- _class: lead -->

# 2-1-5
# 開発だけで使う道具は分けて入れる

Node.js 入門 — Module 2 / レッスン2-1

<!-- ノート: 本番環境という言葉が出てくる最初の場面です。分ける理由を1つだけ押さえます。 -->

---

## なぜ必要か

- テスト用の道具まで本番のサーバーに配ると、無駄に重くなる
- どれが本番で必要な部品なのか、後から見分けられなくなる

<!-- ノート: つかみ。全部入りの弊害を、重さと分かりにくさの2点で示します。 -->

---

## 結論

**本番でも要るものはdependencies、開発中だけ要るものはdevDependenciesに入れる**

- **devDependencies** — 開発中だけ使うパッケージを書く場所

<!-- ノート: 結論を先に言い切ります。判断基準は「本番で動かすときに要るか」だけです。 -->

---

## -D を付けると開発用になる

```bash
npm install dayjs          # dependencies へ(本番でも使う)
npm install -D typescript  # devDependencies へ(開発中だけ)
```

```bash
npm install --omit=dev     # 本番用に、開発用を除いて入れる
```

<!-- ノート: --omit=dev は本番のデプロイで使う書き方です。名前だけ知っておけば十分です。 -->

---

<!-- _class: summary -->

## まとめ

**本番でも要るものはdependencies、開発中だけ要るものはdevDependenciesに入れる**

<!-- ノート: 結論の再掲だけ。プロジェクトの土台がこれでそろいました。 -->
