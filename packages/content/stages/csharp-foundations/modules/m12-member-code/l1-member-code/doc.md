---
sourceRefs: [SRC-mslearn-console-writeline-20261104, SRC-mslearn-csharp-methods-20261106, SRC-mslearn-csharp-contains-20261108, SRC-mslearn-csharp-replace-20261108, SRC-mslearn-csharp-char-20261106, SRC-mslearn-csharp-indexer-20261106, SRC-mslearn-csharp-length-20261106, SRC-mslearn-csharp-parse-20261106]
---
# レッスン12-1 会員コード

## このレッスンの目標

- [ ] 仕様を読み、入力ごとの期待ログと期待戻り値を区別できます。
- [ ] 空白があったかを調べてから、指定された空白を削除できます。
- [ ] 数字の桁数を整数への変換で調べない理由を説明できます。

## 12-1-1 仕様を表で確かめる

> **入力ごとに期待ログを順番どおりに並べ、期待戻り値を別の欄に書きます。**

会員登録の入力チェックでは、成否だけでなく、表示する文も仕様の一部です。ここでのログは、メソッド内で `Console.WriteLine` を使って出す行です。戻り値は、`return` で呼び出し側へ返す値です。戻り値が正しくても、ログの文や順番が違えば仕様を満たしません。

期待値は、仕様から決まる正しい結果です。実行結果をそのまま正解にすると、実装の誤りを見落とします。入力をどの条件に当てはめたかを確認し、その条件で指定されたログと戻り値を読み取ります。

会員コード8桁の仕様では、空白があったかどうかで失敗ログが変わります。表の `/` は改行、`""` は空文字です。「ログなし」は、空の行を出すことではありません。

| 入力 | 期待ログ | 期待戻り値 |
| --- | --- | --- |
| `"12345678"` | ログなし | `""` |
| `"12345"` | 入力値の桁数が正しくありません | `"Err"` |
| `"12 345678"` | 空白を検知しました | `""` |
| `"12 34 567"` | 空白を検知しました / 入力値が正しくありません | `"Err"` |
| `""` | 入力値の桁数が正しくありません | `"Err"` |
| 全角空白3個 | 空白を検知しました / 入力値が正しくありません | `"Err"` |

`"12 34 567"` は、空白を消すと数字7文字です。最初に空白の検知を1行出し、その次に失敗のログを出します。`""` と全角空白3個は、削除後の長さは同じ0でも、通る条件が違います。

また、元の8桁仕様では、空白のない `"1234567a"` も「入力値の桁数が正しくありません」です。長さが8でも、すべて半角数字という条件を満たさないためです。ログの文を独自に変えず、問題ごとの仕様に合わせます。

表示と戻り値の書き方は、[Console.WriteLine](https://learn.microsoft.com/ja-jp/dotnet/api/system.console.writeline) と [メソッドの概要](https://learn.microsoft.com/ja-jp/dotnet/csharp/methods)で確認できます。

## 12-1-2 空白を消す前に調べる

> **空白があったかを Contains で調べてから、Replace の戻り値で空白を取り除きます。**

`Contains` は、指定した文字列を含むかどうかを `bool` で返すメソッドです。`Replace` は、指定した文字列をすべて置き換えた文字列を返します。空文字へ置き換えると、その部分を取り除けます。

次は、ラベルに含まれる半角空白を調べるための参考例です。

```csharp
string label = "A B";
bool hadSpace = label.Contains(" ");
string compact = label.Replace(" ", "");
Console.WriteLine(hadSpace); // => True
Console.WriteLine(compact); // => AB
```

`Replace` を呼ぶだけでは、元の変数の値は変わりません。戻り値を別の変数に入れるか、元の変数へ代入して使います。上の例では `label` に `"A B"`、`compact` に `"AB"` が残ります。

もし削除した結果だけで `Contains` を呼ぶと、空白はもう見つかりません。`"A B"` と `"AB"` は、削除後には同じ文字列になるからです。空白があったという事実は、削除前に調べておきます。

会員コードの仕様が対象にする空白は、次の2種類だけです。

| 文字 | 含むかを調べる指定 | 空文字へ置き換える指定 |
| --- | --- | --- |
| 半角空白 | `Contains(" ")` | `Replace(" ", "")` |
| 全角空白 | `Contains("　")` | `Replace("　", "")` |

先頭や末尾だけでなく、途中の空白も対象です。指定した文字列に一致する箇所はすべて置き換わります。タブは、この仕様では空白の検知や削除の対象にしません。

`Contains` と `Replace` の動作は、Microsoft Learn の [String.Contains](https://learn.microsoft.com/en-us/dotnet/api/system.string.contains) と [String.Replace](https://learn.microsoft.com/en-us/dotnet/api/system.string.replace)を参照しています。上の参考例は教材用に作成しました。

## 12-1-3 文字のまま数字を調べる

> **数字の桁数は、文字列の長さと各文字が '0'〜'9' かどうかで確かめます。**

会員コードは、計算するための数ではありません。`"01234567"` は先頭の0を含む8文字です。整数にすると `1234567` になり、7文字の `"1234567"` と区別できません。整数への変換が成功したという事実だけでは、元の桁数は分かりません。

| 文字列 | 文字列の長さ | 整数へ変換した値 |
| --- | --- | --- |
| `"01234567"` | 8 | `1234567` |
| `"1234567"` | 7 | `1234567` |

空文字や、数字以外を含む入力も仕様の対象です。`int.Parse` は変換できない入力で例外になります。会員コードの処理では、指定されたログと `"Err"` を返す必要があります。数字として計算せず、文字列のまま調べます。

`Length` で長さを確かめ、`s[i]` で各文字を読みます。半角数字は `'0'` から `'9'` までです。たとえば、1文字を範囲で比べる書き方は次のとおりです。

```csharp
char letter = '4';
bool isDigit = letter >= '0' && letter <= '9';
Console.WriteLine(isDigit); // => True
```

全角の `'４'` はこの範囲に入りません。見た目が数字でも、半角数字という仕様には合いません。

空文字の長さは0で、先頭の文字は存在しません。先頭0を調べる変更版でも、先に数字8桁かを確認します。条件を満たした場合だけ先頭を読むと、空文字で存在しない位置を読まずに済みます。

長さと文字の参照は [String.Length](https://learn.microsoft.com/ja-jp/dotnet/api/system.string.length) と [String.Chars](https://learn.microsoft.com/ja-jp/dotnet/api/system.string.chars)、文字の比較は [char](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/builtin-types/char)を参照しています。整数への変換は [Int32.Parse](https://learn.microsoft.com/ja-jp/dotnet/api/system.int32.parse)で確認できます。

## もっと知りたい人へ

- [String.Contains メソッド](https://learn.microsoft.com/en-us/dotnet/api/system.string.contains)
- [String.Replace メソッド](https://learn.microsoft.com/en-us/dotnet/api/system.string.replace)
- [String.Length プロパティ](https://learn.microsoft.com/ja-jp/dotnet/api/system.string.length)
- [String.Chars インデクサー](https://learn.microsoft.com/ja-jp/dotnet/api/system.string.chars)

単元の課題では、1問を `src/<id>.cs` に書きます。クラスは `public static partial class Answers` です。補助の関数を使う場合は、問題のメソッドの中に書きます。
