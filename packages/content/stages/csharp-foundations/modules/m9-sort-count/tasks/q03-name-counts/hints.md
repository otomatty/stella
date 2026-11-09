## ヒント1 方針

名前を全部読んでから、問い合わせごとに先頭から数えます。問い合わせが変わるたびに件数を 0 に戻します。無ければ 0 を出します。A と a は別の名前です。

## ヒント2 手がかりのコード

```csharp
string[] words = new string[n];
for (int i = 0; i < n; i++) words[i] = Console.ReadLine();
string query = Console.ReadLine();
int c = 0;
for (int i = 0; i < n; i++)
    if (words[i] == query) c++;
```
