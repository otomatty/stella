## ヒント1 方針

長さは s.Length です。先頭は s[0]、末尾は s[s.Length - 1] です。長さが足りないときは、文字を読む前に Length を見ます。足りなければ、決まった文字（- や empty や ok）を返します。

## ヒント2 手がかりのコード

```csharp
if (s.Length <= 1)
{
    return "-";
}
return s.Substring(1, 1);
```
