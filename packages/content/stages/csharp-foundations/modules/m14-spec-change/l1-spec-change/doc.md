---
sourceRefs: [SRC-mslearn-csharp-if-20261104, SRC-mslearn-csharp-methods-20261106, SRC-mslearn-csharp-comparison-20261106, SRC-mslearn-csharp-boolean-20261106, SRC-mslearn-csharp-arithmetic-20261106, SRC-mslearn-console-writeline-20261104, SRC-mslearn-gregorian-leap-year-20261109]
---
# レッスン14-1 仕様変更

## このレッスンの目標

- [ ] 変更する処理と残す処理を分け、前のケースもすべて確かめられます。
- [ ] 区分によって変わる上限を、値を返す関数にできます。
- [ ] 教材の簡略なうるう年の規則を読み、仕様から期待値を決められます。

## 14-1-1 変更する行を分ける

> **変わる行と変わらない行を表に分け、変更後に前の全ケースを実行します。**

注文数の上限など、動いている処理の条件が後から変わることがあります。変更した条件が正しくても、それまでの表示や戻り値が変われば不具合です。編集する前に、仕様の各項目をコードの行に対応させます。

この単元の日付チェックでは、日付の判定を変更します。前の単元は、月01〜12、日01〜31だけを確認しました。今回は月ごとの日数を使い、2月には簡略なうるう年の規則も加えます。

| 対応するコードの行 | 変更するか | 変更後の動作 |
| --- | --- | --- |
| 月と日の範囲を調べる行 | 変更する | 月は01〜12、日は01〜その月の末日かを調べます |
| 2月の上限を決める行 | 追加する | 年が4で割り切れるときは29、それ以外は28です |
| 年の範囲を調べる行 | 追加しない | 年の範囲は引き続き調べません |
| 半角・全角空白を取り除く行 | 変えない | すべての位置から削除し、タブは残します |
| 数字8桁かを調べる行 | 変えない | 長さ8で、すべて半角0〜9かを調べます |
| Check・Importのログを出す行 | 変えない | 文言と出す順番を維持します |
| 成功・失敗を返す行 | 変えない | 成功は空文字、失敗は `"Err"` です |

実際に直すときは、表の左欄を自分のコードの行に対応させます。条件を変更しても、指定がないログの文言やタイミングは変えません。追加演習で別の変更が指定された場合は、その問題の変更点を読み直します。

たとえば、次は注文を受け付けたときの表示と戻り値を分けた参考例です。

```csharp
Console.WriteLine("注文を受け付けました");
return "";
```

上限の条件を変えても、成功時の仕様が同じなら、この表示と戻り値は維持します。`WriteLine` はログを出し、`return` は呼び出し元に値を返します。戻り値が同じでも、余計なログが増えていれば仕様どおりではありません。

変更後は、前のケースをすべて実行し直します。新しい条件の境界だけでは、空白や桁数の処理を壊したことに気づけません。期待値を更新するのは、仕様の変更で結果が変わるケースだけです。

| 入力・モード | 変更前 | 変更後 |
| --- | --- | --- |
| `"20260231"`・Check | ログなし、空文字 | 「日付が正しくありません」、`"Err"` |
| `"20260903"`・Check | ログなし、空文字 | 同じ |
| `"2026 9"`・Import | 「入力値が正しくありません」、`"Err"` | 同じ |
| `"2026 1332"`・Import | 「空白を削除しました」の後に「日付が正しくありません」、`"Err"` | 同じ |

日付が不正でも、数字8桁と確認できたImportの削除ログは残ります。これを成功時だけに変えるのは、その変更が書かれた追加演習です。戻り値とログの各行を、順番まで比べてください。

表示と戻り値の動作は、Microsoft Learn の [Console.WriteLine](https://learn.microsoft.com/ja-jp/dotnet/api/system.console.writeline) と [メソッドの概要](https://learn.microsoft.com/ja-jp/dotnet/csharp/methods)を参照しています。注文の参考例は教材用に作成しました。

## 14-1-2 区分ごとの上限を返す

> **区分によって上限が違うときは、区分を受け取り、上限を返す関数にします。**

商品の区分によって、一度に注文できる個数が違う例を考えます。限定商品は2個まで、それ以外は10個までという仕様です。まず、上限を決める部分だけを関数にします。

```csharp
int GetOrderLimit(string category)
{
    if (category == "限定") { return 2; }
    return 10;
}
```

引数は商品の区分、戻り値は上限の個数です。区分が `"限定"` なら2を返して終了します。その条件に当てはまらないときは、最後の行で10を返します。どの区分でも、上限を1つ返す形です。

注文数を調べる側は、返された上限を使います。

```csharp
int limit = GetOrderLimit("限定");
int quantity = 2;
bool valid = quantity >= 1 && quantity <= limit;
Console.WriteLine(valid); // => True
```

「上限を決める処理」と「範囲内かを比べる処理」が分かれました。限定商品の上限が変わるなら、上限を返す側を直します。呼び出す側では、個数が1以上で上限以下かを引き続き確かめます。

| 区分 | 注文数 | 上限 | 期待値 |
| --- | --- | --- | --- |
| 限定 | 2 | 2 | 範囲内 |
| 限定 | 3 | 2 | 範囲外 |
| 通常 | 10 | 10 | 範囲内 |
| 通常 | 11 | 10 | 範囲外 |

上限ちょうどと、その1つ上を両方試します。`<=` を `<` にすると、上限ちょうどまで不正になります。上限の数字だけでなく、比較の向きと等号も確認してください。

分岐と戻り値は [if ステートメント](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/statements/selection-statements)と[メソッドの概要](https://learn.microsoft.com/ja-jp/dotnet/csharp/methods)、範囲の判定は[比較演算子](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/operators/comparison-operators)と[ブール論理演算子](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/operators/boolean-logical-operators)を参照しています。商品の参考例は教材用に作成しました。

## 14-1-3 仕様から期待値を決める

> **簡略な規則と実際の暦を区別し、その問題の仕様から期待値を決めます。**

この単元の基礎課題では、年が4で割り切れればうるう年とします。うるう年は2月が29日まである年です。それ以外の年では2月を28日までとします。100や400で割り切れるかは、この簡略な仕様では調べません。

「割り切れる」は、整数を割った余りが0ということです。C#の `%` は、割った余りを求める演算子です。次は、商品を4個ずつ箱に入れたときの参考例です。

```csharp
int quantity = 12;
int remainder = quantity % 4;
Console.WriteLine(remainder); // => 0
```

12個なら余りは0です。14個なら余りは2になります。割った商を求める `/` と、余りを求める `%` は役割が違います。余りの計算は Microsoft Learn の[算術演算子](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/operators/arithmetic-operators)を参照しています。箱詰めの参考例は教材用に作成しました。

実際の暦で使うグレゴリオ暦では、4で割り切れる年にも例外があります。100で割り切れる年は平年ですが、400で割り切れる年はうるう年です。Microsoft Learn の [GregorianCalendar.IsLeapYear の Remarks](https://learn.microsoft.com/en-us/dotnet/api/system.globalization.gregoriancalendar.isleapyear?view=net-10.0#remarks)で、この規則を確認できます。

| 年 | 基礎課題の簡略な仕様 | グレゴリオ暦 |
| --- | --- | --- |
| 1900 | うるう年 | 平年 |
| 2000 | うるう年 | うるう年 |
| 2023 | 平年 | 平年 |
| 2024 | うるう年 | うるう年 |
| 2100 | うるう年 | 平年 |

たとえば、基礎課題の `"19000229"` は成功です。実際の暦に合わせて失敗にすると、この問題の仕様に反します。暦の規則へ変更する追加演習では、同じ入力の期待値が変わります。ほかの問題へ、その変更を持ち込まないでください。

年の範囲を調べない前提も残ります。月と日の条件を満たす `"00000101"` は、引き続き成功です。使い慣れた日付の機能を当てはめる前に、受け入れる範囲が問題文と同じか確かめます。

月ごとの日数を確かめるときは、各月の末日と、その1つ上の日番号を使います。2月は平年とうるう年の両方を含めます。ここでいう「1つ上」は翌月1日への繰り上げではありません。4月なら30日と31日を比べ、31日が失敗することを確かめます。

## もっと知りたい人へ

- [if ステートメント](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/statements/selection-statements)
- [メソッドの概要](https://learn.microsoft.com/ja-jp/dotnet/csharp/methods)
- [算術演算子](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/operators/arithmetic-operators)
- [GregorianCalendar.IsLeapYear の Remarks](https://learn.microsoft.com/en-us/dotnet/api/system.globalization.gregoriancalendar.isleapyear?view=net-10.0#remarks)

単元の課題では、1問を `src/<id>.cs` に書きます。補助の関数を使う場合は、問題のメソッドの中に書きます。
