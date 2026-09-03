---
id: 2-1-3
title: package-lock.jsonが版を固定する
takeaway: "package-lock.jsonは実際に入れた版を記録し、誰の環境でも同じ組み合わせを再現する"
introduces: [package-lock.json]
requires: [npm, パッケージ, 依存関係, package.json]
header: "Node.js 入門"
---

<!-- _class: lead -->

# 2-1-3
# package-lock.jsonが版を固定する

Node.js 入門 — Module 2 / レッスン2-1

<!-- ノート: 「自分の環境では動く」を防ぐ仕組みです。lock ファイルをコミットする理由がここにあります。 -->

---

## なぜ必要か

- 同じプロジェクトなのに、人によって動いたり動かなかったりする
- 少し前まで動いていたのに、入れ直したら壊れた

<!-- ノート: つかみ。原因が自分のコードではない場合がある、と気づかせます。 -->

---

## 結論

**package-lock.jsonは実際に入れた版を記録し、誰の環境でも同じ組み合わせを再現する**

- **package-lock.json** — 入った版をすべて記録した、自動生成のファイル

<!-- ノート: 結論を先に言い切ります。package.json は希望、lock は実績、という対比が分かりやすいです。 -->

---

## 希望と実績を分けて持つ

```text
package.json        "dayjs": "^1.11.0"   ← 希望(1.11以上ならよい)
package-lock.json   dayjs 1.11.13        ← 実績(実際に入れた版)
```

- **どちらもGitにコミットする**。lockを外すと再現できなくなる

<!-- ノート: node_modules はコミットしない、lock はコミットする。この対比を強調します。 -->

---

<!-- _class: summary -->

## まとめ

**package-lock.jsonは実際に入れた版を記録し、誰の環境でも同じ組み合わせを再現する**

<!-- ノート: 結論の再掲だけ。次は実行手順に名前を付けます。 -->
