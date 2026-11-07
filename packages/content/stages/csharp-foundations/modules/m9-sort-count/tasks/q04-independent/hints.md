## ヒント1 方針

順番が要るなら Array.Sort です。0〜9 の回数なら、値を添字にした長さ 10 の配列です。名前なら、問い合わせごとに一致する行を数えるか足します。

## ヒント2 手がかりのコード

```csharp
Array.Sort(b);
int[] cnt = new int[10];
for (int i = 0; i < n; i++)
    if (words[i] == query) c++;
```
