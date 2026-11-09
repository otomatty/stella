---
sourceRefs: [SRC-mslearn-csharp-for-20261104, SRC-mslearn-csharp-if-20261104, SRC-mslearn-console-writeline-20261104]
---
# レッスン2-1 繰り返しの書き方

## このレッスンの目標

- [ ] for の始まり、終わり、増減を変えて、数を 1 行ずつ出せます。
- [ ] ループの外に変数を置き、合計や積を返せます。
- [ ] 先頭の値を答えにして、最大か最小を選べます。

## 2-1-1 戻り値を分ける

> **画面に出す処理は void で、計算結果は return で返します。**

`void` は戻り値を返さないメソッドの型です。表示する処理では、中で `Console.WriteLine` を呼びます。`WriteLine` は、渡した値のあとで改行します。合計を返す処理では `int` で `return` します。出すのは呼び出し側です。このステージでは、呼び出し側はテストです。

ループを手で追うときは、回数、`i`、計算前の合計、計算後の合計を表にします。0 回なら、初期値がそのまま残ります。

## 2-1-2 順番に1行ずつ出す

> **for の始まり、終わり、増減を変えると、出す順番が変わります。**

`for` は、初期化、続ける条件、1 回ごとの変化、本体の 4 つでできています。画面に決まった順で数を 1 行ずつ出すときは、戻り値はありません。

```csharp
void PrintFrom1(int n)
{
    for (int i = 1; i <= n; i++)
    {
        Console.WriteLine(i);
    }
}
```

変えてよい場所は 3 つだけです。

| 変えるところ | 例 |
| --- | --- |
| 始まり | `i = 1` を `i = n` や `i = 0` |
| 終わり | `i <= n` を `i >= 1` |
| 増減 | `i++` を `i--` や `i = i + 2` |

毎回同じ数を出すときは、`WriteLine(i)` を `WriteLine(n)` にします。

### 参考例　順番に出す

「n から 1 まで」は始まりが n、終わりが 1 です。「1 行ずつ表示する」ので、繰り返しの中に `WriteLine` を置きます。値を返す問題ではないため、戻り値は `void` です。

- 構文: メソッド、`for`、`Console.WriteLine`
- 引数: `int n`
- 出力: `n` から 1 までを 1 行ずつ（戻り値なし）

```csharp
void PrintDown(int n)
{
    for (int i = n; i >= 1; i--)
    {
        Console.WriteLine(i);
    }
}
```

`n = 3` なら `3` / `2` / `1` です。

### 参考例　最後の 0 まで出ているか

0〜10 の n を受け取り、n から 0 までを 1 行ずつ表示する処理を考えます。

```csharp
void PrintToZero(int n)
{
    for (int i = n; i > 0; i--)
        Console.WriteLine(i);
}
```

`PrintToZero(0)` の仕様は `0` を 1 行出すことです。このコードは 1 行も出しません。n が 0 のとき、最初の判定 `0 > 0` が成り立たないためです。「0 まで」は 0 を含みます。続ける条件を `i >= 0` にすると、0 を表示したあと、`i = -1` で終わります。

```csharp
void PrintToZero(int n)
{
    for (int i = n; i >= 0; i--)
        Console.WriteLine(i);
}
```

| 入力・呼び出し | 表示結果 |
| --- | --- |
| `PrintToZero(0)` | `0` |
| `PrintToZero(1)` | `1 / 0` |
| `PrintToZero(3)` | `3 / 2 / 1 / 0` |

## 2-1-3 ループの外で集計する

> **合計はループの外の変数に足し、終わってから返します。**

箱を 1 つ、ループの外に用意します。中で足すか、掛けます。最後にその箱を返します。

```csharp
int SumTo(int n)
{
    int s = 0;
    for (int i = 1; i <= n; i++)
    {
        s = s + i;
    }
    return s;
}
```

- 合計の初期値は `0`、積の初期値は `1`
- 「のうち〜の個数」も同じ形です。足すのが `i` ではなく `1` です
- 偶数の合計なら、足す直前に `if (i % 2 == 0)` を入れます

### 参考例　繰り返して掛ける

- 構文: メソッド、`for`、`return`
- 引数: `int n`
- 戻り値: `int`（1 から `n` までの積）

```csharp
int ProductTo(int n)
{
    int p = 1;
    for (int i = 1; i <= n; i++)
    {
        p = p * i;
    }
    return p;
}
```

`n = 4` なら `24` です。積の初期値は 1 です。集計用の変数はループの外で用意します。

### 参考例　対象を選びながら合計する

0〜50 の整数 n を受け取り、1 から n のうち、4 で割り切れ、8 では割り切れない整数の合計を返す、という文を読みます。

| 問題文の言葉 | 処理への対応 |
| --- | --- |
| 1 から n | i を 1 から n まで動かす |
| 4 で割り切れる | `i % 4` が 0 |
| 8 では割り切れない | `i % 8` が 0 以外 |
| 合計 | 対象の個数ではなく、対象の値を足す |

n が 12 のとき、4 の倍数は 4、8、12 です。このうち 8 を除くので、4 + 12 = 16 です。合計は 4 を調べた後に 4、8 の後も 4、12 の後に 16 です。

1. 合計を 0 にする。
2. 1 から n まで調べ、2 つの条件を満たす値だけ足す。
3. 繰り返しが終わってから合計を返す。

```csharp
int SelectedTotal(int n)
{
    int total = 0;
    for (int i = 1; i <= n; i++)
    {
        if (i % 4 == 0 && i % 8 != 0)
            total += i;
    }
    return total;
}
```

| 入力 | 結果 |
| --- | --- |
| `12` | `16` |
| `0` | `0` |
| `4` | `4` |
| `8` | `4` |

## 2-1-4 比べて最大を残す

> **先頭の値を答えにして、残りと比べて上書きします。**

配列は使いません。先頭を「いまの答え」にして、残りと `if` で比べて上書きします。

```csharp
int Max3(int a, int b, int c)
{
    int m = a;
    if (b > m) { m = b; }
    if (c > m) { m = c; }
    return m;
}
```

最小は `>` を `<` にします。引数が 5 つなら、`if` を 2 本足します。

### 参考例　いままでの最小

- 構文: `if`（いまの値と、覚えている値を比べる）
- 引数: `int a`, `int b`, `int c`, `int d`
- 戻り値: `int`

```csharp
int Min4(int a, int b, int c, int d)
{
    int m = a;
    if (b < m) { m = b; }
    if (c < m) { m = c; }
    if (d < m) { m = d; }
    return m;
}
```

`(8, 2, 5, 2)` なら `2` です。いままでの最小値を、次の値と比べて更新します。

## もっと知りたい人へ

- [for ステートメント](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/statements/iteration-statements#the-for-statement)
- [if ステートメント](https://learn.microsoft.com/ja-jp/dotnet/csharp/language-reference/statements/selection-statements#if-statement)
- [Console.WriteLine メソッド](https://learn.microsoft.com/ja-jp/dotnet/api/system.console.writeline)

単元の課題では、1 問を `src/<id>.cs` に書きます。クラスは `public static partial class Answers` です。課題一覧から「VS Code で開く」を押して取り組みます。
