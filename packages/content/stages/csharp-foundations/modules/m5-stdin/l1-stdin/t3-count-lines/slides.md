---
sourceRefs: [SRC-mslearn-csharp-readline-20261106, SRC-mslearn-csharp-split-20261106, SRC-mslearn-csharp-for-20261104]
id: 5-1-3
title: 件数のあとで読む
takeaway: "先頭の件数だけ、続く行を読みます。"
introduces: [件数]
requires: [ReadLine, Split, for]
header: "C# の基礎"
---
<!-- _class: lead -->
# 件数のあとで読む
<!-- ノート: 1行目は、そのあとに何行あるかです。 -->
---
# 件数を、合計へ足さない
1行目の N は行の数です。金額や得点ではありません。
<!-- ノート: 入力 2 / 3 40 / 2 70 の 2 は、商品の行数です。 -->
---
# 先頭の件数だけ、続く行を読む
先頭の件数だけ、続く行を読みます。
<!-- ノート: 繰り返す回数と、ReadLine の回数を同じにします。 -->
---
# 2行目を N 個見る
```csharp
int n = int.Parse(Console.ReadLine());
string[] parts = Console.ReadLine().Split();
int s = 0;
for (int i = 0; i < n; i++)
{
    s = s + int.Parse(parts[i]);
}
Console.WriteLine(s);
```
<!-- ノート: i が n に届いたら、もう見ません。 -->
---
# 行が続くときは、繰り返しの中で読む
N が 0 なら、続く行はありません。合計の初期値 0 が残ります。
<!-- ノート: ReadLine を繰り返しの外に置くと、同じ行を何度も足します。 -->
---
<!-- _class: summary -->
# まとめ
先頭の件数だけ、続く行を読みます。
<!-- ノート: 3行目に別の値があるときだけ、ReadLine を追加します。 -->
