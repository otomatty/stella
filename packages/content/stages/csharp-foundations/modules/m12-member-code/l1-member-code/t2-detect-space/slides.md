---
sourceRefs: [SRC-mslearn-csharp-contains-20261108, SRC-mslearn-csharp-replace-20261108]
id: 12-1-2
title: 空白を消す前に調べる
takeaway: "空白があったかを Contains で調べてから、Replace の戻り値で空白を取り除きます。"
introduces: [Contains, Replace]
requires: [bool, 文字列, 空文字, WriteLine, ログ]
header: "C# の基礎"
---
<!-- _class: lead -->
# 12-1-2 空白を消す前に調べる
<!-- ノート: 空白を取り除いた入力でも、取り除く前に空白があったかで必要なログが変わります。 -->
---
# 削除した後では見つからない
`"A B"` の空白を消すと `"AB"` です。
結果だけで、元の入力に空白があったか分かりますか。
<!-- ノート: 最初から AB だった場合と、削除した後の文字列は同じです。入力を直す処理では、この違いが必要になることがあります。 -->
---
# 空白の有無を先に調べる
空白があったかを Contains で調べてから、Replace の戻り値で空白を取り除きます。
<!-- ノート: Contains は含むかを bool で返します。Replace は指定した文字列をすべて置き換えた文字列を返します。 -->
---
# 削除前の判定結果を残す
```csharp
string label = "A B";
bool hadSpace = label.Contains(" ");
string compact = label.Replace(" ", "");
Console.WriteLine(hadSpace); // => True
Console.WriteLine(compact); // => AB
```
<!-- ノート: 半角空白を空文字へ置き換えています。元の label は A B のままです。Replace の戻り値を compact で受け取ります。 -->
---
# 検知する対象を仕様で選ぶ
| 対象 | 含むかを調べる指定 |
| --- | --- |
| 半角空白 | `Contains(" ")` |
| 全角空白 | `Contains("　")` |

この会員コードの仕様では、タブは削除しません。
<!-- ノート: 空白という呼び方だけで対象を広げず、仕様にある2種類を調べます。先頭・途中・末尾のどこにあっても対象です。 -->
---
<!-- _class: summary -->
# まとめ
空白があったかを Contains で調べてから、Replace の戻り値で空白を取り除きます。
<!-- ノート: 空白があったかを Contains で調べてから、Replace の戻り値で空白を取り除きます。 -->
