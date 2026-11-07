## ヒント1 方針

問題文の行の並びで、ReadLine の回数を決めます。1行に複数なら Split、続く N 行なら繰り返しの中で読みます。件数そのものを金額や合計へ足しません。

## ヒント2 手がかりのコード

```csharp
int n = int.Parse(Console.ReadLine());
for (int i = 0; i < n; i++)
{
    string line = Console.ReadLine();
}
```
