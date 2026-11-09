---
sourceRefs: [SRC-mslearn-csharp-substring-20261106, SRC-mslearn-csharp-parse-20261106, SRC-mslearn-csharp-length-20261106, SRC-mslearn-csharp-char-20261106]
id: 13-1-1
title: 文字列の一部を整数にする
takeaway: "長さと各文字を確かめたあと、Substring で切り出した文字列を int.Parse で整数にします。"
introduces: []
requires: [文字列, 文字, Length, Substring, Parse, WriteLine]
header: "C# の基礎"
---
<!-- _class: lead -->
# 13-1-1 文字列の一部を整数にする
<!-- ノート: 商品コードの決まった位置にある数字を、数として扱う場面を考えます。 -->
---
# 入力の形はそろっていますか
商品コードの一部を読んで、分類番号を比べたい場面です。
短い入力や数字以外が届いたら、どうなるでしょうか。
<!-- ノート: 決まった形で届くつもりでも、入力に不備があるかもしれません。 -->
---
# 確かめてから切り出す
長さと各文字を確かめたあと、Substring で切り出した文字列を int.Parse で整数にします。
<!-- ノート: 長さを調べ、各文字が半角の0から9かを確かめます。条件に合う場合だけ、切り出しと変換へ進みます。 -->
---
# 位置2から2文字を取り出す
```csharp
string productCode = "482705";
string part = productCode.Substring(2, 2);
int groupNumber = int.Parse(part);
Console.WriteLine(groupNumber); // => 27
```
<!-- ノート: 半角数字6文字と分かっている参考例です。位置は0から数えます。2番目の引数は終わりの位置ではなく文字数です。 -->
---
# 長さと文字は別々に確かめる
| 操作 | 結果 |
| --- | --- |
| `"48".Substring(2, 2)` | 範囲外なので例外 |
| `"48a705".Substring(2, 2)` | 文字列の `"a7"` |
| `int.Parse("a7")` | 整数にできず例外 |
<!-- ノート: 数字以外でも、切り出す範囲があれば Substring は成功します。切り出せることと、整数へ変換できることを分けて考えます。 -->
---
<!-- _class: summary -->
# まとめ
長さと各文字を確かめたあと、Substring で切り出した文字列を int.Parse で整数にします。
<!-- ノート: 長さと各文字を確かめたあと、Substring で切り出した文字列を int.Parse で整数にします。 -->
