## ヒント1 方針

配列は先頭から a.Length 回見ます。出すのは i ではなく a[i] です。後ろからなら始まりを a.Length - 1、変化を i-- にします。条件に合うものだけ出すなら、WriteLine の前に if を入れます。

## ヒント2 手がかりのコード

```csharp
for (int i = 0; i < a.Length; i++)
{
    Console.WriteLine(a[i]);
}
```
