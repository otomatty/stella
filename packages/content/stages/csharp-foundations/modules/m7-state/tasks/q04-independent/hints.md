## ヒント1 方針

最後の値、回数、最小、連続のどれをループの外に置くかを、問題文から選びます。1行目の個数に合わせて、続く行を読みます。件数そのものを答えに足しません。

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
