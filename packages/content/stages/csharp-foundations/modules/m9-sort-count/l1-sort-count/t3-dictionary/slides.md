---
sourceRefs: [SRC-mslearn-csharp-containskey-20261106, SRC-mslearn-csharp-dict-keys-20261106, SRC-mslearn-csharp-dictionary-20261106, SRC-mslearn-csharp-if-20261104, SRC-mslearn-csharp-string-20261106]
id: 9-1-3
title: 名前をキーにする
takeaway: "名前ごとの回数は、Dictionary に入れてから読みます。"
introduces: [Dictionary, ContainsKey, Keys]
requires: [文字列, if, for, 件数, 出現回数]
header: "C# の基礎"
---
<!-- _class: lead -->
# 名前をキーにする
<!-- ノート: キーが名前、値がその回数です。 -->
---
# 最初は 0 を入れる
初めての名前は、足す前に 0 を入れます。
<!-- ノート: 無いキーへいきなり足すと、例外になります。 -->
---
# 読む前に確認する
```csharp
if (counts.ContainsKey(query)) Console.WriteLine(counts[query]);
else Console.WriteLine(0);
```
<!-- ノート: plum のように未登録なら 0 です。 -->
---
# 大文字と小文字は別
A と a は、別のキーです。
<!-- ノート: 辞書の中の並びは、出力の順に使いません。 -->
---
# 全部読んでから種類を数える
途中で 2 回でも、後で 3 回になることがあります。
<!-- ノート: Keys は、登録された名前を一つずつ出します。 -->
---
<!-- _class: summary -->
# まとめ
名前ごとの回数は、Dictionary に入れてから読みます。
<!-- ノート: 未登録は、確認してから 0 にします。 -->
