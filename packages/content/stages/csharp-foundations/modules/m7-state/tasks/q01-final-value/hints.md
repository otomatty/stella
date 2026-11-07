## ヒント1 方針

1行目を Split して x と N にします。現在値は x から始め、続く N 行を足します。N が 0 なら、x をそのまま出します。毎回 x に戻すと、前の増減が消えます。

## ヒント2 手がかりのコード

```csharp
string[] header = Console.ReadLine().Split();
int current = int.Parse(header[0]);
int n = int.Parse(header[1]);
for (int i = 0; i < n; i++)
{
    int value = int.Parse(Console.ReadLine());
}
```
