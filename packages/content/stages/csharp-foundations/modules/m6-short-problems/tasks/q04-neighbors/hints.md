## ヒント1 方針

N と 2 行目の整数を読みます。i は 0 から n-2 までです。差が負なら符号を反転します。二重ループは使いません。

## ヒント2 手がかりのコード

```csharp
for (int i = 0; i < n - 1; i++)
{
    int difference = int.Parse(parts[i + 1]) - int.Parse(parts[i]);
    if (difference < 0) difference = -difference;
}
```
