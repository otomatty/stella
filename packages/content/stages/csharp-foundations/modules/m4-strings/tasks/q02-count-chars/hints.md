## ヒント1 方針

個数の箱は 0 です。空文字はループが 0 回なので 0 です。半角数字は '0' 以上 '9' 以下です。全部数字かは、1 つでも外れたら false、空は false です。含むかは、見つかった時点で true です。

## ヒント2 手がかりのコード

```csharp
int count = 0;
for (int i = 0; i < s.Length; i++)
{
    if (s[i] >= '0' && s[i] <= '9')
    {
        count = count + 1;
    }
}
return count;
```
