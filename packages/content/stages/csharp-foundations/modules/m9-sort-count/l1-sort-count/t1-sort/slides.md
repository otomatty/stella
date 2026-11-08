---
sourceRefs: [SRC-mslearn-csharp-arrays-20261106, SRC-mslearn-csharp-for-20261104, SRC-mslearn-csharp-sort-20261106, SRC-mslearn-console-writeline-20261104]
id: 9-1-1
title: 並べてから位置を見る
takeaway: "小さい順にするときは、Array.Sort で並べてから位置を見ます。"
introduces: [Array.Sort]
requires: [配列, 要素, Length, for, WriteLine, 添字]
header: "C# の基礎"
---
<!-- _class: lead -->
# 並べてから位置を見る
<!-- ノート: 順番を変えてから、欲しい位置を見ます。 -->
---
# 配列自身の順番が変わる
Array.Sort は、別の配列を作らず、その配列の順番を変えます。
<!-- ノート: 入力のときの位置が要るなら、並べる前に別の配列へ写します。 -->
---
# 同じ値も残る
1 が二つあれば、二つとも残ります。一つにはまとめません。
<!-- ノート: 6, 1, 4, 1 は 1, 1, 4, 6 になります。 -->
---
# 先頭から出す
```csharp
Array.Sort(a);
for (int i = 0; i < a.Length; i++)
    Console.WriteLine(a[i]);
```
<!-- ノート: 出力は 1、1、4、6 の 4 行です。 -->
---
# 2番目は a[1]
添字は 0 からです。1 始まりの K 番目は a[K - 1] です。
<!-- ノート: K が 2 なら、並べたあとの 2 番目です。 -->
---
<!-- _class: summary -->
# まとめ
小さい順にするときは、Array.Sort で並べてから位置を見ます。
<!-- ノート: 大きい方から出すときは、末尾から取り出します。 -->
