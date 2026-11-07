---
sourceRefs: [SRC-mslearn-csharp-containskey-20261106, SRC-mslearn-csharp-dict-keys-20261106, SRC-mslearn-csharp-dictionary-20261106, SRC-mslearn-csharp-foreach-20261106, SRC-mslearn-csharp-if-20261104]
id: 10-1-2
title: 更新してから判定する
takeaway: "基準と比べるのは、全部の更新が終わってからです。"
introduces: [foreach]
requires: [Dictionary, ContainsKey, Keys, 現在値, if, for]
header: "C# の基礎"
---
<!-- _class: lead -->
# 更新してから判定する
<!-- ノート: 途中で基準を超えても、その場では数えません。 -->
---
# 初登場は 0
名前が無ければ、足す前に 0 を入れます。
<!-- ノート: 増減は、その 0 へ加えます。上書きしません。 -->
---
# 全部の更新が先
red は 7 のあと -4 で 3 になります。
<!-- ノート: 途中の 7 を数えると、最後のチーム数が違います。 -->
---
# 登録された名前だけ
```csharp
foreach (string name in totals.Keys)
    if (totals[name] >= threshold) count++;
```
<!-- ノート: 記録の行数ではなく、名前の数を見ます。 -->
---
# 調べる回数
更新は N 回、最後の判定はチーム数だけです。
<!-- ノート: チーム数は N 以下なので、合わせて最大 2N 回です。 -->
---
<!-- _class: summary -->
# まとめ
基準と比べるのは、全部の更新が終わってからです。
<!-- ノート: 入力に現れたチームだけを数えます。 -->
