## ヒント1 方針

長さ 10 の配列を用意し、値そのものを添字にして回数を足します。0 から見て、回数がいまの候補より大きいときだけ候補を変えます。同数では変えません。

## ヒント2 手がかりのコード

```csharp
int[] cnt = new int[10];
for (int i = 0; i < n; i++) cnt[int.Parse(parts[i])]++;
if (cnt[v] > bestCnt)
{
    bestCnt = cnt[v];
    bestVal = v;
}
```
