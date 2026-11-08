---
sourceRefs: [SRC-mslearn-csharp-arrays-20261106, SRC-mslearn-csharp-for-20261104]
id: 3-1-1
title: 配列を順に見る
takeaway: "配列は for と Length で、先頭から要素を出します。"
introduces: [配列, 要素, Length]
requires: [for, void, WriteLine]
header: "C# の基礎"
---
<!-- _class: lead -->
# 配列を順に見る
<!-- ノート: 1 から n ではなく、並んだ値を順に見ます。 -->
---
# 1 から n のままでは、配列の中身は出ません
回数を n にすると、要素の数とずれます。出す値を i にすると、中身ではなく回数になります。
<!-- ノート: 結論はこの次のスライドです。 -->
---
# Length 回、要素を出す
配列は for と Length で、先頭から要素を出します。
<!-- ノート: 箱は不要です。中で WriteLine します。 -->
---
# 先頭から 1 行ずつ
```csharp
for (int i = 0; i < a.Length; i++)
{
    Console.WriteLine(a[i]);
}
```
<!-- ノート: a[i] が、その位置の要素です。 -->
---
# 末尾から出すときは始まりを変える
始まりは a.Length - 1、続ける条件は i >= 0、変化は i-- です。
<!-- ノート: 位置 0 も出します。 -->
---
<!-- _class: summary -->
# まとめ
配列は for と Length で、先頭から要素を出します。
<!-- ノート: 課題では、出す値と if の条件だけを問題文に合わせます。 -->
