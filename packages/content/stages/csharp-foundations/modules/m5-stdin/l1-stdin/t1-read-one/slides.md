---
sourceRefs: [SRC-mslearn-csharp-readline-20261106, SRC-mslearn-csharp-parse-20261106, SRC-mslearn-console-writeline-20261104]
id: 5-1-1
title: 整数を1つ読む
takeaway: "ReadLine は文字列なので、整数にするには Parse します。"
introduces: [標準入力, ReadLine, Parse]
requires: [WriteLine, void]
header: "C# の基礎"
---
<!-- _class: lead -->
# 整数を1つ読む
<!-- ノート: ここからは、引数ではなく画面の入力を読みます。 -->
---
# 読んだ値は、まだ文字列です
ReadLine の戻り値を、そのまま足すことはできません。
<!-- ノート: 文字列の足し算は、数字の足し算になりません。 -->
---
# ReadLine のあとで Parse する
ReadLine は文字列なので、整数にするには Parse します。
<!-- ノート: int.Parse は、数字の並びを int にします。 -->
---
# 1行を読んで1行出す
```csharp
int n = int.Parse(Console.ReadLine());
Console.WriteLine(n + 1);
```
<!-- ノート: 入力 7 なら、画面は 8 です。 -->
---
# 計算は、読んだあとに足す
偶数、符号、合計は、整数になってから if や for で分けます。
<!-- ノート: 読み方は同じで、そのあとの計算だけ変えます。 -->
---
<!-- _class: summary -->
# まとめ
ReadLine は文字列なので、整数にするには Parse します。
<!-- ノート: 答えは WriteLine で1行です。 -->
