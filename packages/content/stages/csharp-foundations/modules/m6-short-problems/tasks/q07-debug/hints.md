## ヒント1 方針

差が負のまま最大を更新すると、右が小さい組が残しません。判定を代入で上書きすると、最後の文字だけが残ります。

## ヒント2 手がかりのコード

```csharp
if (difference < 0) difference = -difference;
if (s[i] < '0' || s[i] > '9')
{
    Console.WriteLine("No");
    return;
}
```
