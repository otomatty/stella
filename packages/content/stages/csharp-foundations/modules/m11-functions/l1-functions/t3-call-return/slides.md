---
sourceRefs: [SRC-mslearn-csharp-boolean-20261106, SRC-mslearn-csharp-methods-20261106]
id: 11-1-3
title: 戻り値を次へ渡す
takeaway: "呼んだメソッドの戻り値を、次の計算に使います。"
introduces: [呼び出し]
requires: [return, bool, 引数]
header: "C# の基礎"
---
<!-- _class: lead -->
# 戻り値を次へ渡す
<!-- ノート: 呼んだ結果を、次の計算に渡します。 -->
---
# 呼んだだけでは変わりません
戻り値を捨てると、元の値のままです。
<!-- ノート: メソッドは、渡した変数を書き換えません。 -->
---
# 変数で受け取ります
```csharp
int withFee = AddFee(price);
return withFee + 30;
```
<!-- ノート: 0 に手数料 20 と梱包 30 を足すと 50 です。 -->
---
# 部品の結果を判定に使います
片道の距離を 2 倍し、上限以下かを返します。
<!-- ノート: Distance の戻り値を、RoundTripFits が使います。 -->
---
# 中では表示しません
計算の結果は return で返します。
<!-- ノート: 画面に出すのは呼び出し側です。 -->
---
<!-- _class: summary -->
# まとめ
呼んだメソッドの戻り値を、次の計算に使います。
<!-- ノート: 同じ計算を、呼び出し側で書き直しません。 -->
