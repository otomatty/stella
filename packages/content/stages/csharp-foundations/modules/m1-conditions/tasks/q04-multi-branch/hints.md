## ヒント1 方針

3つ以上に分けるときは else if を足します。点数のように大きい閾値から先に見ます。季節は、月の範囲を && でつなぎます。

## ヒント2 手がかりのコード

```csharp
if (score >= 80)
{
    return "A";
}
else if (score >= 60)
{
    return "B";
}
else
{
    return "C";
}
```
