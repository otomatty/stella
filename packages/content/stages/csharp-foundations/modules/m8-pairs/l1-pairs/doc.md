---
sourceRefs: [SRC-mslearn-csharp-for-20261104, SRC-mslearn-csharp-if-20261104, SRC-mslearn-console-writeline-20261104, SRC-mslearn-csharp-arrays-20261106, SRC-mslearn-csharp-readline-20261106, SRC-mslearn-csharp-parse-20261106, SRC-mslearn-csharp-split-20261106, SRC-mslearn-csharp-comparison-20261106]
---
# レッスン8-1 二重ループ

## このレッスンの目標

- [ ] 別の二つの列から 1 個ずつ選び、条件を満たす組を数えられます。
- [ ] 同じ列の異なる位置を、次の位置から見て数えられます。
- [ ] 行ごとの数を、行が変わるたびに 0 へ戻せます。

## 8-1-1 内側は毎回先頭から

> **別の列を組み合わせるときは、内側の繰り返しを毎回先頭から始めます。**

A と B が別の列なら、A の各要素と B の全要素を組み合わせます。A が 1, 3、B が 2, 4 のとき、和が 5 より大きい組は 3 と 4 の 1 組です。5 ちょうどは「5 より大きい」に入りません。

```csharp
public static partial class Answers
{
    public static void CountGreaterThanFive()
    {
        int[] a = { 1, 3 };
        int[] b = { 2, 4 };
        int count = 0;
        for (int i = 0; i < a.Length; i++)
        {
            for (int j = 0; j < b.Length; j++)
            {
                if (a[i] + b[j] > 5) count++;
            }
        }
        Console.WriteLine(count);
    }
}
```

内側の j は、i が変わるたび 0 から始まります。長さ N と M の二つの列なら、調べる回数は N×M です。同じ列の異なる二つなら N×(N-1)/2 です。N が 20 なら、それぞれ 400 回と 190 回です。

## 8-1-2 同じ列は次の位置から

> **同じ列の異なる二つは、内側を次の位置から始めます。**

列が 2, 2, 5 のとき、異なる位置で同じ値になる組は 1 組です。j を i + 1 から始めると、同じ位置を選ばず、順序違いを重複して数えません。

```csharp
public static partial class Answers
{
    public static void CountEqualPairs()
    {
        int[] a = { 2, 2, 5 };
        int count = 0;
        for (int i = 0; i < a.Length; i++)
        {
            for (int j = i + 1; j < a.Length; j++)
            {
                if (a[i] == a[j]) count++;
            }
        }
        Console.WriteLine(count);
    }
}
```

距離を見るときも、位置の組は同じです。位置が 0, 3, 7, 3 で上限が 3 なら、組は (0,1), (0,2), (0,3), (1,2), (1,3), (2,3) です。差の絶対値は 3, 7, 3, 4, 0, 4 なので、上限以下は 3 組です。差が負なら符号を変えます。値が等しくても、位置が違えば選べます。

## 8-1-3 行が変わるたびに戻す

> **行ごとの数は、行が変わるたびに 0 へ戻します。**

1 行目が H W、続く H 行が W 個の整数です。各行の合計を出すなら、行が変わるたびに合計を 0 にします。入力 2 2、1 3、2 5 なら、出力は 4 と 7 です。

```csharp
public static partial class Answers
{
    public static void PrintRowTotals()
    {
        string[] size = Console.ReadLine().Split();
        int h = int.Parse(size[0]);
        int w = int.Parse(size[1]);
        for (int row = 0; row < h; row++)
        {
            string[] parts = Console.ReadLine().Split();
            int total = 0;
            for (int col = 0; col < w; col++) total += int.Parse(parts[col]);
            Console.WriteLine(total);
        }
    }
}
```

各行の負の値の個数も同じです。個数を行の外で一度だけ 0 にすると、2 行とも -1 の入力が 1 と 2 になります。仕様は 1 と 1 です。列を変えるたびに 0 にすると、今度は 1 行分を数えられません。

列の合計を残すときは、行のループの外に `int[] totals = new int[w];` を置き、列ごとに足します。`new int[w]` は w 個の 0 です。1 行に複数の値を出すときは、先頭以外の前だけ空白を付け、行の最後で WriteLine します。
