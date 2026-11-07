---
sourceRefs: [SRC-mslearn-csharp-bool-20261106, SRC-mslearn-csharp-methods-20261106]
id: 11-1-1
title: 条件そのものを返す
takeaway: "条件そのものを bool で返します。"
introduces: [bool]
requires: [return, 引数, 比較]
header: "C# の基礎"
---
<!-- _class: lead -->
# 条件そのものを返す
<!-- ノート: 条件の結果を、そのまま返します。 -->
---
# bool は true か false
条件の答えを、そのまま返します。
<!-- ノート: 中では表示しません。 -->
---
# 2 で割って 0 なら true
偶数は、割った余りが 0 です。
<!-- ノート: 0 も偶数です。 -->
---
# 条件式を return します
```csharp
return n % 2 == 0;
```
<!-- ノート: if で文字列へは変えません。 -->
---
# 出すのは呼び出し側
返した bool を画面に出すのは、テストです。
<!-- ノート: メソッドの中で WriteLine しません。 -->
---
<!-- _class: summary -->
# まとめ
条件そのものを bool で返します。
<!-- ノート: 以上は >=、より大きいは > です。 -->
