---
sourceRefs: [SRC-mslearn-csharp-arrays-20261106, SRC-mslearn-csharp-for-20261104, SRC-mslearn-csharp-if-20261104, SRC-mslearn-console-writeline-20261104]
---
# レッスン3-1 配列の書き方

## このレッスンの目標

- [ ] for と Length で、配列の要素を 1 行ずつ出せます。
- [ ] ループの外の変数に要素を足し、合計や最大を返せます。
- [ ] 条件に合う要素だけを数えられます。

## 3-1-1 配列を順に見る

> **配列は for と Length で、先頭から要素を出します。**

前の単元の集計と同じ for です。違うのは、1 から n ではなく配列を順に見ることです。回数は n ではなく `a.Length` です。見るものは i ではなく `a[i]` です。

箱は不要です。中で `WriteLine(a[i])` します。

```csharp
public static partial class Answers
{
    public static void PrintAll(int[] a)
    {
        for (int i = 0; i < a.Length; i++)
        {
            Console.WriteLine(a[i]);
        }
    }
}
```

後ろから出すなら、始まりを `a.Length - 1`、増減を `i--` にします。偶数だけ出すなら、`WriteLine` の前に if を入れます。

### 参考例　末尾から出す

「末尾から」は最初の位置が a.Length - 1 です。「先頭まで」は位置 0 を含みます。要素の値 a[i] を出したあと、位置 i を 1 減らします。

- 構文: `int[]`、`for`、`.Length`
- 引数: `int[] a`
- 出力: 末尾から先頭へ 1 行ずつ

```csharp
public static partial class Answers
{
    public static void PrintReverse(int[] a)
    {
        for (int i = a.Length - 1; i >= 0; i--)
        {
            Console.WriteLine(a[i]);
        }
    }
}
```

`{7, 8, 9}` なら `9` / `8` / `7` です。

## 3-1-2 配列の合計を返す

> **配列の合計は、ループの外の変数に要素を足して返します。**

添字は、配列の中の位置です。先頭の添字は 0 で、`a[i]` がその位置の要素です。箱は s または m です。中で足すか、大きい方で上書きします。最大は `int m = a[0]` にして、i = 1 から比べます。

```csharp
public static partial class Answers
{
    public static int SumOf(int[] a)
    {
        int s = 0;
        for (int i = 0; i < a.Length; i++)
        {
            s = s + a[i];
        }
        return s;
    }
}
```

### 参考例　配列の最小

- 構文: `int[]`、`for`、`if`
- 引数: `int[] a`（1 個以上）
- 戻り値: `int`

```csharp
public static partial class Answers
{
    public static int MinOf(int[] a)
    {
        int m = a[0];
        for (int i = 1; i < a.Length; i++)
        {
            if (a[i] < m)
            {
                m = a[i];
            }
        }
        return m;
    }
}
```

`{3, 9, 4}` なら `3` です。

### 参考例　最後に現れた位置を覚える

整数配列 a を受け取り、最後に現れる負の値の位置を 0 始まりで返します。負の値がなければ -1 です。空の配列も受け取ります。

| 問題文の言葉 | 処理への対応 |
| --- | --- |
| 位置を返す | 返すのは a[i] ではなく i |
| 最後に現れる | 負の値を見つけるたび、保存した位置を更新する |
| なければ -1 | 保存する位置の初期値を -1 にする |
| 空の配列 | 最初の要素を直接読まず、繰り返しで調べる |

[-2, 4, -7, 0] では、i = 0 で位置を 0 に更新し、i = 1 ではそのままです。i = 2 で 2 に更新し、i = 3 ではそのままです。答えは値の -7 ではなく位置の 2 です。

1. 最後の位置を -1 にする。
2. 先頭から調べ、値が負ならその位置で上書きする。
3. 保存した位置を返す。

```csharp
public static partial class Answers
{
    public static int LastNegative(int[] a)
    {
        int last = -1;
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] < 0)
            {
                last = i;
            }
        }
        return last;
    }
}
```

| 入力・呼び出し | 表示結果 |
| --- | --- |
| `LastNegative(new int[] { -2, 4, -7, 0 })` | `2` |
| `LastNegative(new int[] { })` | `-1` |
| `LastNegative(new int[] { -1 })` | `0` |
| `LastNegative(new int[] { 0, 3 })` | `-1` |

## 3-1-3 条件に合う個数

> **条件に合う要素だけ、個数を 1 増やします。**

箱は `c = 0` です。条件を満たしたら `c = c + 1` します。変えるのは if の条件だけです。

```csharp
public static partial class Answers
{
    public static int CountIf(int[] a, int k)
    {
        int c = 0;
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] >= k)
            {
                c = c + 1;
            }
        }
        return c;
    }
}
```

### 参考例　奇数の個数

- 構文: `int[]`、`for`、`if`、`%`
- 引数: `int[] a`
- 戻り値: `int`

```csharp
public static partial class Answers
{
    public static int CountOdd(int[] a)
    {
        int c = 0;
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] % 2 != 0)
            {
                c = c + 1;
            }
        }
        return c;
    }
}
```

`{3, 9, 4, 11, 6}` なら `3` です。

### 参考例　位置と値のどちらを足しているか

整数配列 a の 0 以上の値だけを合計して返します。空の配列なら 0 です。

```csharp
public static partial class Answers
{
    public static int NonnegativeTotal(int[] a)
    {
        int total = 0;
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] >= 0)
            {
                total += i;
            }
        }
        return total;
    }
}
```

要素が 5 の 1 個だけなら、仕様は 5 です。このコードは 0 です。i = 0、a[i] = 5 です。条件は 5 を見ていますが、足しているのは位置の 0 です。問題が求めるのは値の合計なので、足す対象を a[i] にします。

```csharp
public static partial class Answers
{
    public static int NonnegativeTotal(int[] a)
    {
        int total = 0;
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] >= 0)
            {
                total += a[i];
            }
        }
        return total;
    }
}
```

| 入力・呼び出し | 表示結果 |
| --- | --- |
| `NonnegativeTotal(new int[] { 5 })` | `5` |
| `NonnegativeTotal(new int[] { })` | `0` |
| `NonnegativeTotal(new int[] { -2, 0, 4, 3 })` | `7` |
| `NonnegativeTotal(new int[] { -5 })` | `0` |

## もっと知りたい人へ

- [配列](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/builtin-types/arrays)
- [for ステートメント](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/statements/iteration-statements#the-for-statement)
- [if ステートメント](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/statements/selection-statements#if-statement)
- [Console.WriteLine メソッド](https://learn.microsoft.com/ja-jp/dotnet/api/system.console.writeline)

単元の課題では、1 問を `src/<id>.cs` に書きます。クラスは `public static partial class Answers` です。課題一覧から「VS Code で開く」を押して取り組みます。
