---
sourceRefs: [SRC-mslearn-console-writeline-20261104]
id: 2-1-1
title: 戻り値を分ける
takeaway: "画面に出す処理は void で、計算結果は return で返します。"
introduces: [void]
requires: [return, WriteLine]
header: "C# の基礎"
---
<!-- _class: lead -->
# 戻り値を分ける
<!-- ノート: 表示する課題と、値を返す課題の型を分けます。 -->
---
# 出したつもりが、戻り値には残っていません
`WriteLine` は画面に出します。呼び出し側がその値を受け取ることはできません。
<!-- ノート: 合計を返す課題で WriteLine だけだと、テストは値を読めません。 -->
---
# void で出す。return で返す
画面に出す処理は void で、計算結果は return で返します。
<!-- ノート: WriteLine は行の末尾で改行します。 -->
---
# 出す処理の形
```csharp
void PrintFrom1(int n)
{
    Console.WriteLine(n);
}
```
<!-- ノート: 合計なら int にして、最後に return します。 -->
---
# 0 回なら初期値が残る
回数、i、計算前、計算後を表にします。本体が動かなければ、箱の初期値のままです。
<!-- ノート: n が 0 の合計は、足す前の 0 です。 -->
---
<!-- _class: summary -->
# まとめ
画面に出す処理は void で、計算結果は return で返します。
<!-- ノート: 課題文の「出力」と「戻り値」を先に見ます。 -->
