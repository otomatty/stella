---
sourceRefs: [SRC-mslearn-csharp-string-20261106, SRC-mslearn-csharp-char-20261106, SRC-mslearn-csharp-length-20261106, SRC-mslearn-csharp-readline-20261106, SRC-mslearn-csharp-if-20261104]
id: 6-1-2
title: 文字列を判定する
takeaway: "文字列は長さと文字で判定し、空は長さ 0 です。"
introduces: []
requires: [ReadLine, 文字列, 文字, 空文字, Length, if]
header: "C# の基礎"
---
<!-- _class: lead -->
# 文字列を判定する
<!-- ノート: 2行で比べる問と、1行を文字ごとに見る問です。 -->
---
# 2行なら S と T
空行は空文字です。中身を見ない問は Length だけを使います。
<!-- ノート: 1行目が S、2行目が T です。 -->
---
# 空は長さ 0 です
文字列は長さと文字で判定し、空は長さ 0 です。
<!-- ノート: 全部数字か、のような問で空は No です。 -->
---
# 長さが同じかを出す
```csharp
string s = Console.ReadLine();
string t = Console.ReadLine();
Console.WriteLine(s.Length == t.Length);
```
<!-- ノート: 画面の Yes と No は、この真偽から選びます。 -->
---
# 1行は文字を順に見る
数字は '0' から '9' です。先頭だけ見る問は s[0] です。空の先頭は読みません。
<!-- ノート: 同じ位置を数えるときは、両方の添字を i にします。 -->
---
<!-- _class: summary -->
# まとめ
文字列は長さと文字で判定し、空は長さ 0 です。
<!-- ノート: 答えは WriteLine で 1 行です。 -->
