---
sourceRefs: [SRC-mslearn-csharp-string-20261106, SRC-mslearn-csharp-char-20261106, SRC-mslearn-csharp-substring-20261106, SRC-mslearn-csharp-for-20261104, SRC-mslearn-csharp-if-20261104, SRC-mslearn-console-writeline-20261104]
---
# レッスン4-1 文字列の書き方

## このレッスンの目標

- [ ] 文字列の長さを Length で見て、s[i] で位置の文字を読めます。
- [ ] 空文字は 0 回にして、条件に合う文字だけ個数を数えられます。
- [ ] Substring で部分文字列を切り、先頭の 0 を残せます。

文字は 1 文字で、`'A'` のように書きます。文字列は `"A"` のように書きます。`bool` は、条件が成り立つ `true` と成り立たない `false` です。`WriteLine` で表示すると True または False になります。課題の true と false は、戻り値です。

長さ 0 の文字列では、`s[0]` や `Substring` で存在しない位置を読むと例外になります。先頭や末尾を読む例は 1 文字以上、6 文字を切る例は 6 文字、8 文字を切る問題は 8 文字が前提です。長さが足りないこともある問題では、最初に長さを確かめてから位置を見ます。

文字を文字列にしたいときは `s[0].ToString()` です。文字同士を `+` すると文字コードの足し算になるので、端をつなぐなら `s[0].ToString() + s[s.Length - 1]` のようにします。

## 4-1-1 位置の文字を読む

> **文字列は Length で長さを見て、s[i] でその位置の文字を読みます。**

配列の `a[i]` が、文字列の `s[i]` になります。回数は `s.Length` です。先頭は `s[0]`、末尾は `s[s.Length - 1]` です。

```csharp
public static partial class Answers
{
    public static int Len(string s)
    {
        return s.Length;
    }
}
```

### 参考例　末尾の文字

末尾の文字は、位置 s.Length - 1 の 1 文字です。文字列全体ではないので、戻り値は char です。s は 1 文字以上を受け取ります。

- 構文: `.Length`、`s[i]`
- 引数: `string s`
- 戻り値: `char`

```csharp
public static partial class Answers
{
    public static char LastChar(string s)
    {
        return s[s.Length - 1];
    }
}
```

`LastChar("abc")` は `c` です。

### 参考例　文字を読む前に長さを確かめる

空でない文字列の末尾が半角数字なら true、それ以外は false です。空文字なら false です。

```csharp
public static partial class Answers
{
    public static bool EndsInDigit(string s)
    {
        return s[s.Length - 1] >= '0'
            && s[s.Length - 1] <= '9'
            && s.Length > 0;
    }
}
```

空文字では、s.Length - 1 が -1 になります。長さの判定より前にその位置を読もうとするので、結果を返す前に例外になります。`&&` は左から調べ、false が出ると右側を調べません。長さの条件を先頭へ移します。

```csharp
public static partial class Answers
{
    public static bool EndsInDigit(string s)
    {
        return s.Length > 0
            && s[s.Length - 1] >= '0'
            && s[s.Length - 1] <= '9';
    }
}
```

| 入力・呼び出し | 表示結果 |
| --- | --- |
| `EndsInDigit("")` | `False` |
| `EndsInDigit("A2")` | `True` |
| `EndsInDigit("2a")` | `False` |
| `EndsInDigit("９")` | `False` |

## 4-1-2 文字の個数

> **空文字は 0 回で、条件に合う文字だけ個数を 1 増やします。**

前の単元の個数と同じです。条件が `'0'` から `'9'`、または `== c` になります。空文字はループが 0 回なので、個数は 0 です。全部数字かは、1 つでも外れたら false です。空は false です。

```csharp
public static partial class Answers
{
    public static int CountDigit(string s)
    {
        int count = 0;
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] >= '0' && s[i] <= '9')
            {
                count = count + 1;
            }
        }
        return count;
    }
}
```

### 参考例　文字 a の個数

- 構文: `for`、`s[i]`、`==`
- 引数: `string s`
- 戻り値: `int`

```csharp
public static partial class Answers
{
    public static int CountA(string s)
    {
        int count = 0;
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] == 'a')
            {
                count = count + 1;
            }
        }
        return count;
    }
}
```

`CountA("banana")` は 3、`CountA("")` は 0 です。

### 参考例　指定された文字だけを数える

文字列に含まれる半角小文字 a、e、i、o、u の個数を返します。大文字やほかの文字は数えません。空文字も受け取ります。

| 問題文の言葉 | 処理への対応 |
| --- | --- |
| 含まれる個数 | 各文字について数える。あるかどうかだけではない |
| a、e、i、o、u | この五つのどれかなら対象 |
| 大文字は数えない | A と a を区別する |
| 空文字 | 調べる文字がないので答えは 0 |

Aoui! を順に見ると、A は対象外、o で 1、u で 2、i で 3、! は対象外です。最終結果は 3 です。

1. 個数を 0 にする。
2. 各文字が五つのどれかと一致したら 1 増やす。
3. 最後に個数を返す。

```csharp
public static partial class Answers
{
    public static int CountVowels(string s)
    {
        int count = 0;
        for (int i = 0; i < s.Length; i++)
        {
            char c = s[i];
            if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u')
            {
                count = count + 1;
            }
        }
        return count;
    }
}
```

| 入力・呼び出し | 表示結果 |
| --- | --- |
| `CountVowels("Aoui!")` | `3` |
| `CountVowels("")` | `0` |
| `CountVowels("sky")` | `0` |
| `CountVowels("aeiou")` | `5` |

## 4-1-3 部分文字列を切る

> **部分文字列は Substring で切り、数値にはしません。**

`s.Substring(開始, 長さ)` で切ります。数値にしないので、先頭の 0 は残します。8 文字の年・月・日は `(0, 4)`、`(4, 2)`、`(6, 2)` です。

```csharp
public static partial class Answers
{
    public static string Head4(string s)
    {
        return s.Substring(0, 4);
    }
}
```

### 参考例　6文字を2文字ずつ

- 構文: `Substring`
- 引数: `string s`
- 出力: 3行

```csharp
public static partial class Answers
{
    public static void PrintParts(string s)
    {
        Console.WriteLine(s.Substring(0, 2));
        Console.WriteLine(s.Substring(2, 2));
        Console.WriteLine(s.Substring(4, 2));
    }
}
```

`PrintParts("abcdef")` は `ab` / `cd` / `ef` です。数値にしないので、先頭の 0 は残します。

## もっと知りたい人へ

- [文字列型](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/builtin-types/reference-types)
- [char 型](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/builtin-types/char)
- [String.Substring メソッド](https://learn.microsoft.com/ja-jp/dotnet/api/system.string.substring)
- [for ステートメント](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/statements/iteration-statements#the-for-statement)
- [if ステートメント](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/statements/selection-statements#if-statement)
- [Console.WriteLine メソッド](https://learn.microsoft.com/ja-jp/dotnet/api/system.console.writeline)

単元の課題では、1 問を `src/<id>.cs` に書きます。クラスは `public static partial class Answers` です。課題一覧から「VS Code で開く」を押して取り組みます。
