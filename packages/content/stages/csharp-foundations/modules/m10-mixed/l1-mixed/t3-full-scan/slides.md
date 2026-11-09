---
sourceRefs: [SRC-mslearn-csharp-comparison-20261106, SRC-mslearn-csharp-foreach-20261106, SRC-mslearn-csharp-if-20261104]
id: 10-1-3
title: 全部見てから決める
takeaway: "成り立つと決めるのは、全部の要素を見てからです。"
introduces: []
requires: [foreach, if, return, 配列, 要素, 比較]
header: "C# の基礎"
---
<!-- _class: lead -->
# 全部見てから決める
<!-- ノート: 失敗は早く、成功は最後です。 -->
---
# 範囲外はすぐ false
一つでも 0 未満か 100 超なら、そこで false です。
<!-- ノート: 残りの要素を見る必要はありません。 -->
---
# 途中の true は早い
10 の直後に true を返すと、後ろの 101 を見ません。
<!-- ノート: 結果は true になります。仕様は false です。 -->
---
# true は繰り返しの外
```csharp
foreach (int score in a)
    if (score < 0 || score > 100) return false;
return true;
```
<!-- ノート: 空の配列は繰り返しに入らず、true です。 -->
---
# 端も範囲内
0 と 100 は範囲内です。-1 は範囲外です。
<!-- ノート: ちょうど境界の値を、範囲外にしないでください。 -->
---
<!-- _class: summary -->
# まとめ
成り立つと決めるのは、全部の要素を見てからです。
<!-- ノート: 成り立たない一つは、見つけた時点で false です。 -->
