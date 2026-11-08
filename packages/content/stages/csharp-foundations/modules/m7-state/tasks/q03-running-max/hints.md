## ヒント1 方針

現在値と最大は別の変数です。最大の初期値は、ループに入る前の現在値です。足したあとに、現在値が最大より大きければ最大を入れ替えます。

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
