---
sourceRefs: [SRC-mslearn-csharp-char-20261106, SRC-mslearn-csharp-indexer-20261106, SRC-mslearn-csharp-length-20261106]
id: 11-1-2
title: 1文字ずつ見て判定する
takeaway: "文字列は 1 文字ずつ見て、bool で返します。"
introduces: []
requires: [bool, 文字列, 文字, 空文字, Length, for]
header: "C# の基礎"
---
<!-- _class: lead -->
# 1文字ずつ見て判定する
<!-- ノート: 数値には変換しません。 -->
---
# 長さが違えば false
指定の長さでなければ false です。
<!-- ノート: 先に Length を見ます。 -->
---
# 1文字ずつ範囲を見る
'0' から '9'、'A' から 'Z' の間かを見ます。
<!-- ノート: s[i] で 1 文字を取ります。 -->
---
# 空文字は長さ 0
長さが 0 なら、指定の桁数には合いません。
<!-- ノート: 空でも、ループの前に長さで false にできます。 -->
---
# 数値には変換しません
文字のまま比べます。
<!-- ノート: Parse は使いません。 -->
---
<!-- _class: summary -->
# まとめ
文字列は 1 文字ずつ見て、bool で返します。
<!-- ノート: 1 文字でも範囲外なら false です。 -->
