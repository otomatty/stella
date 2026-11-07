## ヒント1 方針

先に小さな関数を作り、その戻り値を次の関数で受け取ります。同じ計算を、呼び出し側で書き直しません。

## ヒント2 手がかりのコード

```csharp
int oneWay = Distance(a, b);
return oneWay * 2 <= budget;
```
