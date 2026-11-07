---
sourceRefs: [SRC-mslearn-csharp-substring-20261106, SRC-mslearn-csharp-string-20261106]
id: 4-1-3
title: 部分文字列を切る
takeaway: "部分文字列は Substring で切り、数値にはしません。"
introduces: [部分文字列, Substring]
requires: [文字列]
header: "C# の基礎"
---
<!-- _class: lead -->
# 部分文字列を切る
<!-- ノート: 切り出したあと、数値にしない理由です。 -->
---
# int にすると、先頭の 0 が消えます
"09" を数値にすると 9 になり、桁が足りなくなります。
<!-- ノート: 結論はこの次です。 -->
---
# Substring のまま返す
部分文字列は Substring で切り、数値にはしません。
<!-- ノート: 先頭の 0 は文字列のまま残ります。 -->
---
# 開始と長さ
```csharp
string year = s.Substring(0, 4);
string month = s.Substring(4, 2);
string day = s.Substring(6, 2);
```
<!-- ノート: 8 文字の並びを、年・月・日に分けます。 -->
---
# 末尾は Length から戻る
末尾 n 文字は、開始が s.Length - n、長さが n です。
<!-- ノート: 固定の位置だけだと、長い文字列でずれます。 -->
---
<!-- _class: summary -->
# まとめ
部分文字列は Substring で切り、数値にはしません。
<!-- ノート: 長さが足りないときは、切る前に Length を見ます。 -->
