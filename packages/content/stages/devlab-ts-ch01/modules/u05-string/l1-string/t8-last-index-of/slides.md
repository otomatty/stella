---
sourceRefs: [SRC-typescriptbook-values-types-variables-string]
id: 5-1-8
title: 最後に出てくる位置を調べる
takeaway: "文字列.lastIndexOf(文字) で、最後に見つかった位置がわかります。"
introduces: ["lastIndexOf"]
requires: ["const", "文字列", "メソッド", "引数", "添字", "indexOf"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 5-1-8 最後に出てくる位置を調べる

<!-- ノート: この動画では、最後に出てくる位置を調べる方法を学びます。 -->

---

# 保存先の区切りを探す

保存先の名前を階層ごとに区切って表示します。いちばん奥の場所に注目するとき、同じ区切りが何度も現れます。

<!-- ノート: 保存先には、いくつかのフォルダー名が並んでいます。 -->

---

# 覚えること

文字列.lastIndexOf(文字) で、最後に見つかった位置がわかります。

<!-- ノート: 文字列.lastIndexOf(文字) で、最後に見つかった位置がわかります。 -->

---

# 最後に出てくる位置を調べる

```ts
// 保存先で最後に出るスラッシュの位置を調べる
const lastFolderMark = "棚/箱/奥".lastIndexOf("/");
```

<!-- ノート: 保存先の名前には、区切りが二つあります。 右から探して先に見つかるのは、奥の手前の区切りです。 左端から数えると、見つかったのは 3 番目でした。 -->

---

# 探す向きと位置の数え方

`lastIndexOf` は右から探し、位置は左端の `0` から数えます。見つからないときは `-1` が返ります。

参考資料は[サバイバルTypeScriptの string 型](https://typescriptbook.jp/reference/values-types-variables/string)です。コード例は教材用に作成しています。

<!-- ノート: `lastIndexOf` は右から探し、位置は左端の `0` から数えます。見つからないときは `-1` が返ります。 -->

---

<!-- _class: summary -->
# まとめ

文字列.lastIndexOf(文字) で、最後に見つかった位置がわかります。

<!-- ノート: 文字列.lastIndexOf(文字) で、最後に見つかった位置がわかります。 -->
