## ヒント1 方針

1行を Split で分け、足りる個数だけ int.Parse します。2つなら先頭と次、3つならその次も使います。計算の結果は WriteLine で1行です。

## ヒント2 手がかりのコード

```csharp
string[] parts = Console.ReadLine().Split();
int a = int.Parse(parts[0]);
int b = int.Parse(parts[1]);
```
