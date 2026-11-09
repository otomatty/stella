---
sourceRefs: [SRC-mslearn-console-writeline-20261104, SRC-mslearn-csharp-methods-20261106, SRC-mslearn-csharp-comparison-20261106, SRC-mslearn-csharp-boolean-20261106]
---
# レッスン15-1 修了確認の進め方

## このレッスンの目標

- [ ] 実装前に、仕様の各分岐を入力・モード・期待ログ・期待戻り値の表にできます。
- [ ] 手順と必要な部品を決め、新しいファイルで実装できます。
- [ ] 仕様変更後に前の全ケースを確かめ、別の仕様にも取り組めます。

## 15-1-1 期待結果を表にする

> **実装する前に、仕様の各分岐を入力・モード・期待ログ・期待戻り値の表にします。**

修了確認では、仕様A、仕様Aの変更、仕様Bの順に取り組みます。確認の課題にはヒントがありません。解答例は合格後に開けます。文法やAPIの使い方は調べてかまいません。仕様の不明点は、実装前に確認してください。

まず問題文を読み、入力の範囲とモードごとの処理を確認します。次に、入力・モード・期待ログ・期待戻り値を10件以上の表にします。各行が仕様のどの分岐を確かめるかも書き添えます。件数だけを増やさず、成功、失敗、境界を含めてください。

参考に、予約人数を調べる例を考えます。入力は整数で、1〜3人なら予約できます。モードはPreviewとRegisterです。範囲内なら戻り値は `"Accepted"` です。Registerだけ「予約しました」を1行出し、Previewではログを出しません。範囲外なら、どちらのモードも「人数不正」を1行出し、`"Rejected"` を返します。

| 入力 | モード | 期待ログ | 期待戻り値 | 確かめる分岐 |
| --- | --- | --- | --- | --- |
| -1 | Preview | 人数不正 | `"Rejected"` | 下限未満 |
| -1 | Register | 人数不正 | `"Rejected"` | 下限未満 |
| 0 | Preview | 人数不正 | `"Rejected"` | 下限の1つ手前 |
| 0 | Register | 人数不正 | `"Rejected"` | 下限の1つ手前 |
| 1 | Preview | なし | `"Accepted"` | 下限ちょうど、表示なし |
| 1 | Register | 予約しました | `"Accepted"` | 下限ちょうど、表示あり |
| 3 | Preview | なし | `"Accepted"` | 上限ちょうど、表示なし |
| 3 | Register | 予約しました | `"Accepted"` | 上限ちょうど、表示あり |
| 4 | Preview | 人数不正 | `"Rejected"` | 上限の1つ先 |
| 4 | Register | 人数不正 | `"Rejected"` | 上限の1つ先 |

「ログなし」と空の行を1行出すことは違います。複数行のログがある仕様では、表にも出す順番で書きます。戻り値が合っていても、ログの文言や順番が違えば仕様どおりではありません。

次は、予約ができたRegisterの場合の表示と戻り値です。

```csharp
Console.WriteLine("予約しました");
return "Accepted";
```

`WriteLine` は1行を表示し、`return` は呼び出し元へ値を返します。この2つを別の欄で予想すると、戻り値だけを見て終えるのを防げます。表示と戻り値は、Microsoft Learnの [Console.WriteLine](https://learn.microsoft.com/ja-jp/dotnet/api/system.console.writeline) と [メソッドの概要](https://learn.microsoft.com/ja-jp/dotnet/csharp/methods)を参照しています。予約人数の参考例は教材用に作成しました。

表は、自分が仕様を読み取れたか確かめるために作ります。表や手順のメモそのものは、自動テストで採点されません。提出するコードを書く前の準備として、自分の手元に残してください。

## 15-1-2 手順を決めてから書く

> **表の各行を処理する手順と必要な部品を決めてから、新しいファイルで実装します。**

期待結果が決まったら、条件を調べる順番を書きます。後の処理を行うために、先に何を確かめる必要があるか考えてください。たとえば、文字列の一部を読む処理では、その位置まで文字があると確認する必要があります。

予約人数の例なら、手順を次のように書けます。

1. 人数が範囲内かを調べます。
2. 範囲外なら「人数不正」を出し、`"Rejected"` を返します。
3. 範囲内でRegisterなら「予約しました」を出します。
4. `"Accepted"` を返します。

どの判定を部品にするかも、自分で決めます。この例では、人数が範囲内かを返す部品を作れます。

```csharp
bool IsSeatCountValid(int seats)
{
    return seats >= 1 && seats <= 3;
}
```

引数は人数、戻り値は範囲内かどうかです。部品がログを出すのか、値だけを返すのかも決めておきます。この部品は値だけを返し、ログを出すかどうかは呼び出す側で決めます。

引数と戻り値は[メソッドの概要](https://learn.microsoft.com/ja-jp/dotnet/csharp/methods)、範囲の式は[比較演算子](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/operators/comparison-operators)と[ブール論理演算子](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/operators/boolean-logical-operators)を参照しています。部品の分け方は、この参考例のために決めたものです。

手順を決めたら、前の完成コードを写さず、新しいファイルで書きます。この課題では、配布された新しい `src/<id>.cs` の未実装部分を使います。補助の関数を作る場合は、問題のメソッドの中に書いてください。

実装後は、自分の表の入力で確かめ、配布されたテストも実行します。違いが出たら、失敗した入力、期待結果、実際の結果を比べます。原因を見つけて修正し、同じ入力でもう一度確かめてください。確認用の表示を足した場合は、最後に取り除きます。

## 15-1-3 変更後も全ケースを確かめる

> **仕様を変更した後は、変更点のケースに加えて、前の全ケースを実行し直します。**

仕様Aに合格したら、変更の課題に取り組みます。変更文を読んで、前のケースのうち、期待結果が変わるものを確認します。変更されていない条件やログは、そのまま残します。

予約人数の上限が3人から4人に変わる例では、範囲の式を次のように直します。

```csharp
bool valid = seats >= 1 && seats <= 4;
```

4人の結果は変わりますが、0人や3人の結果は変わりません。

| 入力・モード | 変更前 | 変更後 |
| --- | --- | --- |
| 4・Preview | 「人数不正」、`"Rejected"` | ログなし、`"Accepted"` |
| 4・Register | 「人数不正」、`"Rejected"` | 「予約しました」、`"Accepted"` |
| 0・Register | 「人数不正」、`"Rejected"` | 同じ |
| 3・Register | 「予約しました」、`"Accepted"` | 同じ |

前の全ケースを実行し直し、新しい上限の1つ先である5人も試します。期待値を変えるのは、変更文で結果が変わるケースだけです。実装の結果に合わせて期待値を変えないでください。`<=` と `&&` の動作は[比較演算子](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/operators/comparison-operators)と[ブール論理演算子](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/operators/boolean-logical-operators)を参照しています。

仕様Bは、仕様Aに合格し、変更の課題を終えて間を空けてから取り組みます。別の仕様を読み、表、手順、実装、確認を新しいファイルで行います。前に使ったモード名や処理順から、今回の動作を決めつけないでください。

表と手順は、仕様Bでも自分の確認に使います。条件を調べる順番やログを出す理由を、自分の言葉で確かめながら進めましょう。

## もっと知りたい人へ

- [メソッドの概要](https://learn.microsoft.com/ja-jp/dotnet/csharp/methods)
- [Console.WriteLine](https://learn.microsoft.com/ja-jp/dotnet/api/system.console.writeline)
- [比較演算子](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/operators/comparison-operators)
- [ブール論理演算子](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/operators/boolean-logical-operators)

単元の課題は、仕様A、仕様Aの変更、仕様Bの3つです。各課題の問題文を読み、1問ずつ確認して提出します。
