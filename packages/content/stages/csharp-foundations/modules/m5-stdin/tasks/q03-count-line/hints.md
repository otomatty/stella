## ヒント1 方針

1行目の N だけ繰り返します。2行目は Split して、i が 0 から N の手前まで parts[i] を見ます。K が3行目の問題は、ReadLine をもう1回します。

## ヒント2 手がかりのコード

```csharp
int n = int.Parse(Console.ReadLine());
string[] parts = Console.ReadLine().Split();
for (int i = 0; i < n; i++)
{
    int value = int.Parse(parts[i]);
}
```
