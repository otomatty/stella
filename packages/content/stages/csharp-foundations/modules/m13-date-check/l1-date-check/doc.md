---
sourceRefs: [SRC-mslearn-csharp-substring-20261106, SRC-mslearn-csharp-parse-20261106, SRC-mslearn-csharp-length-20261106, SRC-mslearn-csharp-indexer-20261106, SRC-mslearn-csharp-char-20261106, SRC-mslearn-csharp-contains-20261108, SRC-mslearn-csharp-replace-20261108, SRC-mslearn-console-writeline-20261104, SRC-mslearn-csharp-methods-20261106, SRC-mslearn-csharp-comparison-20261106, SRC-mslearn-csharp-boolean-20261106]
---
# レッスン13-1 日付チェック

## このレッスンの目標

- [ ] 入力の長さと文字を確かめてから、一部を切り出して整数にできます。
- [ ] 入力とモードの組合せごとに、期待ログと期待戻り値を読み取れます。
- [ ] 仕様に書かれた範囲だけを検証できます。

## 13-1-1 文字列の一部を整数にする

> **長さと各文字を確かめたあと、Substring で切り出した文字列を int.Parse で整数にします。**

商品コードなどでは、決まった位置の数字に意味を持たせることがあります。`Substring(開始位置, 長さ)` は、文字列の一部を文字列として返します。開始位置は0から数えます。2番目の引数は、終わりの位置ではなく取り出す文字数です。

次は、半角数字6文字と確認できている商品コードの参考例です。位置2から2文字を取り出し、整数にします。

```csharp
string productCode = "482705";
string part = productCode.Substring(2, 2);
int groupNumber = int.Parse(part);
Console.WriteLine(groupNumber); // => 27
```

| 位置 | 0 | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- | --- |
| 文字 | 4 | 8 | 2 | 7 | 0 | 5 |

`part` は文字列の `"27"`、`groupNumber` は整数の `27` です。`int.Parse` は文字列を整数に変換します。数の範囲を比較したいときに使えます。元の文字列を変更する処理ではありません。

外から受け取る入力は、この参考例と同じ形とは限りません。切り出しや変換の前に、次の順で確かめます。

1. `Length` で、仕様どおりの長さかを調べます。
2. 各文字が半角の `'0'`〜`'9'` かを調べます。
3. 条件を満たした場合だけ、決めた位置から切り出して整数にします。

日付8桁チェックでも、空白を処理した後に数字8桁かを確かめます。満たさない入力は、仕様のログと戻り値で終了します。日付の部分を切り出してから、不正な文字を探す順にはしません。

| 確認を省いた操作 | 起こること |
| --- | --- |
| `"48".Substring(2, 2)` | 取り出す2文字が存在せず、例外になります |
| `"48a705".Substring(2, 2)` | 切り出し自体は成功し、`"a7"` を返します |
| `int.Parse("a7")` | 整数に変換できず、例外になります |

例外は、実行中の問題を知らせる仕組みです。数字以外でも、範囲内なら `Substring` は切り出せます。その文字列を整数に変換できるかは別の条件です。`int.Parse` は、整数の範囲を超える値でも例外になります。この課題で取り出す2桁や4桁の半角数字は、`int` の範囲に収まります。

切り出しと変換の動作は、Microsoft Learn の [String.Substring](https://learn.microsoft.com/ja-jp/dotnet/api/system.string.substring) と [Int32.Parse](https://learn.microsoft.com/ja-jp/dotnet/api/system.int32.parse)を参照しています。長さと文字の確認は [String.Length](https://learn.microsoft.com/ja-jp/dotnet/api/system.string.length)、[String.Chars](https://learn.microsoft.com/ja-jp/dotnet/api/system.string.chars)、[char](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/builtin-types/char)で確認できます。商品コードの参考例は教材用に作成しました。

## 13-1-2 モードごとにログの順番を確かめる

> **入力とモードの組合せごとに、期待ログを出る順に並べ、期待戻り値を別の欄に書きます。**

入力が同じでも、モードによって表示するログが変わります。`Check` は入力を確かめるモード、`Import` は取り込み時のモードです。どちらも成功は空文字、失敗は `"Err"` を返します。

空白を見つけるには `Contains`、取り除くには `Replace` を使えます。調べるのは半角空白と全角空白です。先頭・途中・末尾のどこにあっても削除し、タブは削除しません。削除前に空白があったかを残しておくと、モードごとのログを判断できます。

元の仕様では、`Check` は空白を検知した時点でログを出します。`Import` は数字8桁と分かってから削除ログを出します。その後に日付が不正と分かっても、すでに出した削除ログは取り消しません。

表の `/` は改行、`""` は空文字です。「ログなし」は、空の行も出さないことを表します。

| 入力 | モード | 期待ログ | 期待戻り値 |
| --- | --- | --- | --- |
| `"2026 0903"` | Check | 空白を検知しました | `""` |
| `"2026 0903"` | Import | 空白を削除しました | `""` |
| `"2026 1332"` | Check | 空白を検知しました / 日付が正しくありません | `"Err"` |
| `"2026 1332"` | Import | 空白を削除しました / 日付が正しくありません | `"Err"` |
| `"2026 9"` | Check | 空白を検知しました / 入力値が正しくありません | `"Err"` |
| `"2026 9"` | Import | 入力値が正しくありません | `"Err"` |
| `"2026090a"` | Check | 入力値の桁数が正しくありません | `"Err"` |
| `"20260903"` | Import | ログなし | `""` |

`"2026 9"` は、空白を削除しても数字8桁になりません。`Import` では削除ログを出す条件に届かず、入力のエラーだけが出ます。`"2026090a"` も数字8桁ではないので、日付の判定には進みません。表示文は独自に変えず、仕様に合わせます。

変更の課題では、変更点を元の仕様と区別して読みます。削除ログのタイミングを変える問題でも、変更対象でない `Check` の動作は維持します。

文字列の操作は [String.Contains](https://learn.microsoft.com/en-us/dotnet/api/system.string.contains) と [String.Replace](https://learn.microsoft.com/en-us/dotnet/api/system.string.replace)、表示と戻り値は [Console.WriteLine](https://learn.microsoft.com/ja-jp/dotnet/api/system.console.writeline) と [メソッドの概要](https://learn.microsoft.com/ja-jp/dotnet/csharp/methods)で確認できます。

## 13-1-3 仕様にある範囲だけを確かめる

> **元の日付仕様では、月01〜12と日01〜31だけを確かめ、年の範囲や月ごとの日数は判定に足しません。**

「日付チェック」という題名だけでは、検証する条件は決まりません。受け取る形式や、どこまで調べるかは問題文で確認します。数字8桁と分かった後、元の仕様で調べる範囲は次のとおりです。

| 部分 | 桁数 | 元の仕様で確認する条件 |
| --- | --- | --- |
| 年 | 先頭4桁 | 範囲を確認しません |
| 月 | 次の2桁 | 01〜12 |
| 日 | 最後の2桁 | 01〜31 |

この仕様では、`"00000101"` も `"20260231"` も成功です。年の範囲、月ごとの日数、うるう年は見ません。実際の暦にない日でも、指定された条件を満たせば成功します。

仕様にない条件を足すと、本来受け入れる入力まで失敗に変わります。年2000〜2099の条件を足すのは、その変更を指定した問題だけです。ログのタイミングを変える問題や、元の仕様を再実装する問題には持ち込みません。

範囲を比べるときは、下限と上限を両方確かめます。次は、棚番号が1〜20かを調べる参考例です。

```csharp
int shelfNumber = 8;
bool valid = shelfNumber >= 1 && shelfNumber <= 20;
Console.WriteLine(valid); // => True
```

`>=` と `<=` は境界の値も含めます。`&&` は両方が成り立つときに `true` です。[比較演算子](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/operators/comparison-operators)と[ブール論理演算子](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/operators/boolean-logical-operators)を参照しています。棚番号の参考例は教材用に作成しました。

## もっと知りたい人へ

- [String.Substring メソッド](https://learn.microsoft.com/ja-jp/dotnet/api/system.string.substring)
- [Int32.Parse メソッド](https://learn.microsoft.com/ja-jp/dotnet/api/system.int32.parse)
- [String.Contains メソッド](https://learn.microsoft.com/en-us/dotnet/api/system.string.contains)
- [String.Replace メソッド](https://learn.microsoft.com/en-us/dotnet/api/system.string.replace)

単元の課題では、1問を `src/<id>.cs` に書きます。補助の関数を使う場合は、問題のメソッドの中に書きます。
