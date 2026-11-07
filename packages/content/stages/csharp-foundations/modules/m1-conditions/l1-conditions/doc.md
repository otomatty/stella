---
sourceRefs: [SRC-mslearn-csharp-arithmetic-20261106, SRC-mslearn-csharp-comparison-20261106, SRC-mslearn-csharp-boolean-20261106, SRC-mslearn-csharp-if-20261104, SRC-mslearn-console-writeline-20261104]
---
# レッスン1-1 条件分岐の書き方

## このレッスンの目標

- [ ] 計算の結果を return で返せます。
- [ ] if と else if で、条件に合う値を選べます。
- [ ] かつ・またはで、2つの条件を重ねられます。

## 1-1-1 計算結果を返す

> **計算の結果は return で返します。**

引数は、メソッドが受け取る値です。計算した値は return で返します。画面に出すのは呼び出し側で、そこが WriteLine を呼びます。このステージでは、呼び出し側はテストです。

### 参考例　計算して返す

二つの整数の積を返します。引数は二つ、戻り値は int です。

- 構文: メソッド、return
- 引数: int a, int b
- 戻り値: int（積）

```csharp
public static partial class Answers
{
    public static int Product(int a, int b)
    {
        return a * b;
    }
}
```

`Product(3, 4)` は 12、`Product(0, 5)` は 0 です。

## 1-1-2 条件で分ける

> **条件が成り立つ側を if で返し、続きは else if で足します。**

2つに分けるときは if と else です。比較は >=、>、<、<=、== です。以上と、より大きいでは、境界の値が入ります。3つ以上に分けるときは else if を足し、大きい閾値から先に見ます。

### 参考例　2分岐（余り）

- 構文: if else、%
- 引数: int n
- 戻り値: string（yes / no）
- 内容: 10 の倍数なら yes、そうでなければ no

```csharp
public static partial class Answers
{
    public static string MultipleOf10(int n)
    {
        if (n % 10 == 0)
        {
            return "yes";
        }
        else
        {
            return "no";
        }
    }
}
```

20 は yes、21 は no、0 は yes です。

### 参考例　2分岐（以上）

身長が 150 以上なら ride、未満なら wait です。

```csharp
public static partial class Answers
{
    public static string CanRide(int height)
    {
        if (height >= 150)
        {
            return "ride";
        }
        else
        {
            return "wait";
        }
    }
}
```

150 は ride、149 は wait です。

### 参考例　3分岐

70 以上なら pass、40 以上 70 未満なら retry、40 未満なら fail です。大きい閾値を先に見ます。

```csharp
public static partial class Answers
{
    public static string JudgeScore(int score)
    {
        if (score >= 70)
        {
            return "pass";
        }
        else if (score >= 40)
        {
            return "retry";
        }
        else
        {
            return "fail";
        }
    }
}
```

70 は pass、69 と 40 は retry、39 は fail です。

2つの数を比べて、大きい方や小さい方を返すときも if と else です。戻り値は言葉ではなく数です。

## 1-1-3 条件を重ねる

> **かつは両方、またははどちらかが成り立つときに使います。**

かつは &&、またはは || です。範囲は、以上と以下を && でつなぎます。

### 参考例　2引数と かつ

どちらも 10 より大きいなら both、そうでなければ no です。10 は含みません。

```csharp
public static partial class Answers
{
    public static string BothBig(int x, int y)
    {
        if (x > 10 && y > 10)
        {
            return "both";
        }
        else
        {
            return "no";
        }
    }
}
```

11 と 12 は both です。どちらかが 10 なら no です。

### 参考例　問題文から条件を選ぶ

商品金額 price と配送先 zone を受け取り、送料を整数で返します。zone が 1 で、かつ price が 4000 以上なら 0 円です。それ以外は 500 円です。

```csharp
public static partial class Answers
{
    public static int Delivery(int price, int zone)
    {
        if (zone == 1 && price >= 4000)
        {
            return 0;
        }
        return 500;
    }
}
```

price が 4000 で zone が 2 なら、金額は足りても配送先が違うので 500 です。両方そろったときだけ 0 です。

### 参考例　かつ と または を読み分ける

整数 n が 5 より大きく 15 より小さいなら ok、それ以外は ng です。|| は片方が成り立てば全体が成り立つので、範囲の外でも ok になります。両方を満たす範囲なので && にします。境界の 5 と 15 は含めません。

```csharp
public static partial class Answers
{
    public static string InBand(int n)
    {
        if (n > 5 && n < 15)
        {
            return "ok";
        }
        return "ng";
    }
}
```

5 は ng、6 と 14 は ok、15 は ng です。
