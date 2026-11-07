---
sourceRefs: [SRC-mslearn-csharp-string-20261106, SRC-mslearn-csharp-char-20261106]
id: 4-1-1
title: 位置の文字を読む
takeaway: "文字列は Length で長さを見て、s[i] でその位置の文字を読みます。"
introduces: [文字列, 文字, 空文字]
requires: [Length]
header: "C# の基礎"
---
<!-- _class: lead -->
# 位置の文字を読む
<!-- ノート: 配列の a[i] が、文字列の s[i] になります。 -->
---
# 番号を出すと、文字にはなりません
出す値を i にすると、中身ではなく回数になります。
<!-- ノート: 結論はこの次のスライドです。 -->
---
# Length と s[i]
文字列は Length で長さを見て、s[i] でその位置の文字を読みます。
<!-- ノート: 先頭は 0、末尾は Length - 1 です。 -->
---
# 先頭と末尾
```csharp
int n = s.Length;
char head = s[0];
char tail = s[s.Length - 1];
```
<!-- ノート: 文字は 'A'、文字列は "A" です。 -->
---
# 長さ 0 では位置を読まない
空文字は長さ 0 です。先に Length を見て、足りなければ s[0] を見ません。
<!-- ノート: 存在しない位置を読むと例外になります。 -->
---
<!-- _class: summary -->
# まとめ
文字列は Length で長さを見て、s[i] でその位置の文字を読みます。
<!-- ノート: 文字をつなぐときは、ToString にしてから足します。 -->
