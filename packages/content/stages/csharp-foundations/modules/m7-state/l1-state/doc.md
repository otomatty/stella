---
sourceRefs: [SRC-mslearn-csharp-for-20261104, SRC-mslearn-csharp-if-20261104, SRC-mslearn-console-writeline-20261104, SRC-mslearn-csharp-arrays-20261106, SRC-mslearn-csharp-readline-20261106, SRC-mslearn-csharp-parse-20261106, SRC-mslearn-csharp-comparison-20261106]
---
# レッスン7-1 状態を更新する

## このレッスンの目標

- [ ] 現在値を繰り返しの外に置き、操作のたびに更新できます。
- [ ] 今の値で条件を見て、更新するか飛ばすか選べます。
- [ ] while で、条件を満たすまでの回数を返せます。

## 7-1-1 現在値を次へ渡す

> **現在値は繰り返しの外に置き、次の操作へ渡します。**

最初の水が 12 で、増減が 4、-3、2 なら、途中は 16、13、最後は 15 です。WriteLine は繰り返しの外に置きます。water を毎回 12 に戻すと、前の増減が消えます。

```csharp
public static partial class Answers
{
    public static void FinalWater()
    {
        int water = 12;
        int[] changes = { 4, -3, 2 };
        for (int i = 0; i < changes.Length; i++)
        {
            water = water + changes[i];
        }
        Console.WriteLine(water);
    }
}
```

回数や途中の最大は、現在値とは別の変数です。値は 5 から始まり、3、-7、1 だけ増減します。最後は 2、途中の最大は 8 です。この例では初期値も最大の候補に含めます。

```csharp
public static partial class Answers
{
    public static void PrintBestAndFinal()
    {
        int current = 5;
        int best = current;
        int[] changes = { 3, -7, 1 };
        for (int i = 0; i < changes.Length; i++)
        {
            current = current + changes[i];
            if (current > best)
            {
                best = current;
            }
        }
        Console.WriteLine(best);
        Console.WriteLine(current);
    }
}
```

操作のあとで 0 を数えるときは、足してから調べます。初期値 0 に増減 1 を加えると、操作後は 1 なので回数は 0 です。足す前に数えると、初期値の 0 を数えて 1 になります。

課題では、配列に固定した数値を、行ごとの ReadLine に変えます。

## 7-1-2 買えるときだけ引く

> **価格が今の所持金以下のときだけ引きます。**

所持金 9 から、価格 5、5、2 を順に見ます。1 回目で 4 になり、2 回目の 5 は買えず、3 回目の 2 は買えます。最後は 2 です。同じ価格でも、前に買ったかどうかで次が変わります。

```csharp
public static partial class Answers
{
    public static void RemainingMoney()
    {
        int money = 9;
        int[] prices = { 5, 5, 2 };
        for (int i = 0; i < prices.Length; i++)
        {
            if (prices[i] <= money)
            {
                money = money - prices[i];
            }
        }
        Console.WriteLine(money);
    }
}
```

## 7-1-3 条件が続く間繰り返す

> **while は、条件が成り立つ間、本体を繰り返します。**

1 日で 3 ずつ増える量が、10 以上になるまでの日数は 4 です。0、3、6、9、12 と進み、12 になったところで終わります。増加量が 0 だと終わらないことがあります。この例の増加量は正です。すでに目標以上なら、日数は 0 です。

```csharp
public static partial class Answers
{
    public static void DaysToTen()
    {
        int amount = 0;
        int days = 0;
        while (amount < 10)
        {
            amount = amount + 3;
            days++;
        }
        Console.WriteLine(days);
    }
}
```
