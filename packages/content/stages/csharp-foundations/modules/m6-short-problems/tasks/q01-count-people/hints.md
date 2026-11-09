## ヒント1 方針

1行目を N、2行目を Split して N 個にします。閾値がある問は 3 行目を読みます。if の比較だけを変え、合うたびに 1 を足します。合計の問は人数ではなく点数を足します。

## ヒント2 手がかりのコード

```csharp
int n = int.Parse(Console.ReadLine());
string[] parts = Console.ReadLine().Split();
int p = int.Parse(Console.ReadLine());
int count = 0;
for (int i = 0; i < n; i++)
{
    if (int.Parse(parts[i]) >= p) count = count + 1;
}
Console.WriteLine(count);
```
