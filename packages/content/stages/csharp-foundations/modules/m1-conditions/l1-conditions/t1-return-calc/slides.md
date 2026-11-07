---
sourceRefs: [SRC-mslearn-csharp-arithmetic-20261106, SRC-mslearn-console-writeline-20261104]
id: 1-1-1
title: 計算結果を返す
takeaway: "計算の結果は return で返します。"
introduces: [return, 引数, WriteLine]
requires: [課題]
header: "C# の基礎"
---
<!-- _class: lead -->
# 計算結果を返す
<!-- ノート: 計算した値は、呼び出し側へ返します。 -->
---
# 出した値は、呼び出し側に残りません
WriteLine は画面に出します。メソッドの結果にはなりません。
<!-- ノート: テストは、返した値を読みます。 -->
---
# 計算の結果は return で返します
引数で受け取り、計算して return します。
<!-- ノート: 差、合計、余り、商、2倍は、この形です。 -->
---
# 積を返す
```csharp
public static int Product(int a, int b)
{
    return a * b;
}
```
<!-- ノート: 3 と 4 なら 12 です。 -->
---
# 出すのは呼び出し側
戻り値を画面に出すときは、呼び出し側が WriteLine を呼びます。
<!-- ノート: 課題のメソッドでは出しません。 -->
---
<!-- _class: summary -->
# まとめ
計算の結果は return で返します。
<!-- ノート: 課題文の戻り値を先に見ます。 -->
