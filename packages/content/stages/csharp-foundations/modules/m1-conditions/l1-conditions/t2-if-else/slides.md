---
sourceRefs: [SRC-mslearn-csharp-if-20261104, SRC-mslearn-csharp-comparison-20261106]
id: 1-1-2
title: 条件で分ける
takeaway: "条件が成り立つ側を if で返し、続きは else if で足します。"
introduces: [if, else, else if, 比較]
requires: [return]
header: "C# の基礎"
---
<!-- _class: lead -->
# 条件で分ける
<!-- ノート: 2つに分けるところから、段階を足します。 -->
---
# 一つの式では、以上と未満を同時に表せません
60 以上を pass、未満を fail にするには、条件で分けます。
<!-- ノート: 比較の記号が、境界を含むかを決めます。 -->
---
# if で返し、続きは else if
条件が成り立つ側を if で返し、続きは else if で足します。
<!-- ノート: 2つだけなら else で終わります。 -->
---
# 60 以上なら pass
```csharp
if (score >= 60)
{
    return "pass";
}
else
{
    return "fail";
}
```
<!-- ノート: 以上は >= です。より大きいは > です。 -->
---
# 大きい閾値から見る
80 以上を A、その次に 60 以上を B にするときは、80 を先に書きます。
<!-- ノート: 60 を先に書くと、80 も B になります。 -->
---
<!-- _class: summary -->
# まとめ
条件が成り立つ側を if で返し、続きは else if で足します。
<!-- ノート: 境界の値がどちらの語に入るかを見ます。 -->
