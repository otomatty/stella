---
sourceRefs: [SRC-typescriptbook-values-types-variables-string, SRC-typescriptbook-statements-for-of]
id: 1-2-10
title: 前につないで逆順にする
takeaway: "取り出した文字を前につなぐと、逆の順番になります。"
introduces: []
requires: ["文字列", "文字列の連結", "let", "const", "再代入", "+=", "for-of", "関数", "引数", "export", "string", "return"]
header: "開発ラボG 事前課題 第1部"
---

<!-- _class: lead -->
# 1-2-10 前につないで逆順にする

<!-- ノート: 文字を前につないだときに、並びがどう変わるかを言える。 -->

---

# お皿を上に重ねる

洗ったお皿を、一枚ずつ重ねます。

最後のお皿を置いたら、上からどんな順番に見えるでしょうか。

<!-- ノート: 最初に、青いお皿を置きます。最後のお皿を置いたら、上からどんな順番に見えるでしょうか。 -->

---

# 覚えること

取り出した文字を前につなぐと、逆の順番になります。

<!-- ノート: 今までの結果は先に青を入れておきます。新しい文字を左に置くと、先頭に来ます。 -->

---

# 新しい文字を左に置く

```ts
// 次に受け取った文字を用意する
const c = "紫";
// 受け取った文字を先頭につないで入れ直す
result = c + result;
```

<!-- ノート: 今までの結果は先に青を入れておきます。新しい文字を左に置くと、先頭に来ます。 -->

---

# 後ろにつなぐ場合とくらべる

`result += c` では新しい文字が後ろに来ます。前につなぐには、足す記号の左に新しい文字を置きます。

参考はサバイバルTypeScriptの[string型](https://typescriptbook.jp/reference/values-types-variables/string)・[for-of文](https://typescriptbook.jp/reference/statements/for-of)です。説明と例は教材用に独自作成しています。

<!-- ノート: 足す記号は、文字列を左から順につなぎます。 -->

---

<!-- _class: summary -->
# まとめ

取り出した文字を前につなぐと、逆の順番になります。

<!-- ノート: 取り出した文字を前につなぐと、逆の順番になります。 -->
