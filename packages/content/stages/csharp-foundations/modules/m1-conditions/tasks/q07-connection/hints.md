## ヒント1 方針

時間帯は、範囲を && で書き、else if で次の範囲へ進みます。どの範囲にも入らない時刻が evening です。

## ヒント2 手がかりのコード

```csharp
if (hour >= 5 && hour <= 11)
{
    return "morning";
}
else if (hour >= 12 && hour <= 17)
{
    return "afternoon";
}
else
{
    return "evening";
}
```
