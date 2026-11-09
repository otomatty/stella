## ヒント1 方針

先に長さが 8 かを見ます。それから 1 文字ずつ、'0' 以上 '9' 以下かを見ます。空も、7 文字も、数字以外が 1 つでもあれば false です。

## ヒント2 手がかりのコード

```csharp
if (s.Length != 8)
{
    return false;
}
for (int i = 0; i < s.Length; i++)
{
    if (s[i] < '0' || s[i] > '9')
    {
        return false;
    }
}
return true;
```
