## ヒント1 方針

在庫や残高は、いまの値を更新してから数えます。順位は並べて境界を見ます。組は内側を次の位置から始めます。連続は、いまの長さと最大を別に持ちます。

## ヒント2 手がかりのコード

```csharp
if (order <= stock)
{
    stock = stock - order;
    accepted = accepted + 1;
}
if (current > best) best = current;
```
