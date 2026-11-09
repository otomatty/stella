## ヒント1 方針

配列をコピーしてから Array.Sort します。1 始まりの K 番目は、並べたあとの位置 K-1 です。入力のときの位置と、並べたあとの位置を混ぜません。

## ヒント2 手がかりのコード

```csharp
string[] header = Console.ReadLine().Split();
int n = int.Parse(header[0]);
int k = int.Parse(header[1]);
string[] parts = Console.ReadLine().Split();
int[] b = new int[n];
Array.Sort(b);
```
