---
sourceRefs: [SRC-mslearn-csharp-readline-20261106, SRC-mslearn-csharp-parse-20261106, SRC-mslearn-csharp-split-20261106, SRC-mslearn-csharp-for-20261104, SRC-mslearn-csharp-if-20261104, SRC-mslearn-csharp-comparison-20261106, SRC-mslearn-console-writeline-20261104]
id: 6-1-1
title: 点数から人数を数える
takeaway: "点数は件数のあとで読み、比較に合う人数を数えます。"
introduces: [閾値]
requires: [ReadLine, Parse, Split, for, if, 比較, 個数]
header: "C# の基礎"
---
<!-- _class: lead -->
# 点数から人数を数える
<!-- ノート: 読み方は同じで、if の比較だけを変えます。 -->
---
# 1行目は人数です
2行目に、その人数ぶんの点数が並びます。
<!-- ノート: N を合計へ足しません。 -->
---
# 比較の基準を閾値と呼びます
点数は件数のあとで読み、比較に合う人数を数えます。
<!-- ノート: 3行目が閾値の問と、閾値を読まない問があります。 -->
---
# 合うたびに 1 を足す
```csharp
if (int.Parse(parts[i]) > threshold)
{
    count = count + 1;
}
```
<!-- ノート: より大きいなら、閾値と同じ値は数えません。 -->
---
# 以上と、より大きい
>= は同じ値を数えます。> は数えません。合計点は、人数ではなく点数を足します。
<!-- ノート: 変えるのは比較と、足す値です。 -->
---
<!-- _class: summary -->
# まとめ
点数は件数のあとで読み、比較に合う人数を数えます。
<!-- ノート: 答えは WriteLine で 1 行です。 -->
