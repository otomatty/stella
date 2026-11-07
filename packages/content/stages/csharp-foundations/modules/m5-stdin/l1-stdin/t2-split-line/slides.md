---
sourceRefs: [SRC-mslearn-csharp-split-20261106, SRC-mslearn-csharp-parse-20261106, SRC-mslearn-csharp-readline-20261106]
id: 5-1-2
title: 1行を空白で分ける
takeaway: "1行の複数の値は Split してから、それぞれ Parse します。"
introduces: [Split]
requires: [ReadLine, Parse, 標準入力]
header: "C# の基礎"
---
<!-- _class: lead -->
# 1行を空白で分ける
<!-- ノート: 1行に整数が2つ以上並ぶ問題です。 -->
---
# 1行のままでは、2つの整数になりません
空白の前後を、自分で切り出さなくてよいです。
<!-- ノート: 個数が足りる入力だけを使います。 -->
---
# Split してから Parse する
1行の複数の値は Split してから、それぞれ Parse します。
<!-- ノート: parts[0] が左、parts[1] が右です。 -->
---
# 2つの整数
```csharp
string[] parts = Console.ReadLine().Split();
int a = int.Parse(parts[0]);
int b = int.Parse(parts[1]);
Console.WriteLine(a * b);
```
<!-- ノート: 入力 3 10 なら、画面は 30 です。 -->
---
# 3つなら、3番目も使う
parts[2] を同じように Parse します。使わない残りは読みません。
<!-- ノート: 個数が足りない入力は、この課題では使いません。 -->
---
<!-- _class: summary -->
# まとめ
1行の複数の値は Split してから、それぞれ Parse します。
<!-- ノート: 分けたあとの計算は、今までと同じです。 -->
