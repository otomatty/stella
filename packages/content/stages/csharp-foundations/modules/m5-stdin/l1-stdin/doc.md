---
sourceRefs: [SRC-mslearn-csharp-readline-20261106, SRC-mslearn-csharp-parse-20261106, SRC-mslearn-csharp-split-20261106, SRC-mslearn-csharp-for-20261104, SRC-mslearn-csharp-if-20261104, SRC-mslearn-console-writeline-20261104]
---
# レッスン5-1 標準入力の読み方

## このレッスンの目標

- [ ] 1行の整数を ReadLine と int.Parse で読み、計算結果を1行出せます。
- [ ] 1行の複数の整数を Split してから計算できます。
- [ ] 先頭の件数だけ、続く行を読めます。

## 5-1-1 整数を1つ読む

> **ReadLine は文字列なので、整数にするには Parse します。**

関数の引数ではなく、画面から読みます。読んだあとの計算は、条件分岐や繰り返しと同じです。答えは WriteLine で1行です。

```csharp
public static partial class Answers
{
    public static void PlusOne()
    {
        int n = int.Parse(Console.ReadLine());
        Console.WriteLine(n + 1);
    }
}
```

入力 `7` なら、画面は `8` です。偶数判定や合計は、整数にしたあとに if や for をつなぎます。

## 5-1-2 1行を空白で分ける

> **1行の複数の値は Split してから、それぞれ Parse します。**

個数が足りる入力だけを使います。3つなら、3番目も Parse します。

```csharp
public static partial class Answers
{
    public static void Product()
    {
        string[] parts = Console.ReadLine().Split();
        int a = int.Parse(parts[0]);
        int b = int.Parse(parts[1]);
        Console.WriteLine(a * b);
    }
}
```

入力 `3 10` なら、画面は `30` です。

## 5-1-3 件数のあとで読む

> **先頭の件数だけ、続く行を読みます。**

1行目の N は、そのあとの個数です。2行目を Split し、N 個だけ見ます。

```csharp
public static partial class Answers
{
    public static void PrintCount()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        Console.WriteLine(n);
    }
}
```

入力の1行目が `4`、2行目が `3 9 4 11` なら、画面は `4` です。N を合計へ足しません。

商品の行が続くときは、繰り返しの中で1行ずつ読みます。1行目の N は商品の行数です。各行の個数と単価の積を足し、最後に合計だけを出します。N が 0 なら商品の行はなく、合計は 0 です。

```csharp
public static partial class Answers
{
    public static void TotalPrice()
    {
        int n = int.Parse(Console.ReadLine());
        int total = 0;
        for (int i = 0; i < n; i++)
        {
            string[] parts = Console.ReadLine().Split();
            int quantity = int.Parse(parts[0]);
            int price = int.Parse(parts[1]);
            total = total + quantity * price;
        }
        Console.WriteLine(total);
    }
}
```

入力 `2` / `3 40` / `2 70` なら、金額は 120 と 140 で、画面は `260` です。最初の 2 は行数なので足しません。

次の行を繰り返しの外で読むと、同じ値を N 回足します。読む行は、繰り返す回数と同じだけ、繰り返しの中に置きます。

```csharp
public static partial class Answers
{
    public static void SumLines()
    {
        int n = int.Parse(Console.ReadLine());
        int total = 0;
        for (int i = 0; i < n; i++)
        {
            int value = int.Parse(Console.ReadLine());
            total = total + value;
        }
        Console.WriteLine(total);
    }
}
```

入力 `2` / `3` / `8` なら、画面は `11` です。N が 0 のときは1行も読まず、0 を出します。
