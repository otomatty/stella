---
sourceRefs: [SRC-mslearn-csharp-bool-20261106, SRC-mslearn-csharp-boolean-20261106, SRC-mslearn-csharp-char-20261106, SRC-mslearn-csharp-indexer-20261106, SRC-mslearn-csharp-length-20261106, SRC-mslearn-csharp-methods-20261106]
---
# レッスン11-1 関数の組み合わせ

## このレッスンの目標

- [ ] 条件そのものを bool で返せます。
- [ ] 文字列を 1 文字ずつ見て、bool で返せます。
- [ ] 呼んだメソッドの戻り値を、次の計算に使えます。

## 11-1-1 条件そのものを返す

> **条件そのものを bool で返します。**

中では表示しません。必ず return します。`if` で even のような文字列を返す必要はありません。条件の結果が、そのまま bool です。

### 参考例　3の倍数か

倍数かという問いの答えは true か false です。余りが 0 かどうかを調べ、その判定結果を返します。表示は呼び出し側で行います。

- 構文: メソッド、return、%
- 引数: int n
- 戻り値: bool

```csharp
public static partial class Answers
{
    public static bool IsMultipleOf3(int n)
    {
        return n % 3 == 0;
    }
}
```

9 は true、10 は false です。

## 11-1-2 1文字ずつ見て判定する

> **文字列は 1 文字ずつ見て、bool で返します。**

数値には変換しません。空文字は長さ 0 です。長さが指定と違うときは false にします。

### 参考例　大文字が N 文字か

- 構文: .Length、for、'A'〜'Z'
- 引数: string s, int n
- 戻り値: bool

```csharp
public static partial class Answers
{
    public static bool IsUpperN(string s, int n)
    {
        if (s.Length != n) return false;
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] < 'A' || s[i] > 'Z') return false;
        }
        return true;
    }
}
```

("ABC", 3) は true、("AB", 3) は false です。

## 11-1-3 戻り値を次へ渡す

> **呼んだメソッドの戻り値を、次の計算に使います。**

戻り値は int または string です。表示せず return します。呼んだだけでは、渡した変数は書き換わりません。

### 参考例　積を返す

```csharp
public static partial class Answers
{
    public static int Product(int a, int b)
    {
        return a * b;
    }
}
```

(3, 4) は 12 です。

### 参考例　部品の戻り値を次の判定に使う

二つの整数位置 a、b の距離を返す Distance と、その往復が移動可能量 budget 以下なら true を返す RoundTripFits を作ります。RoundTripFits から Distance を呼びます。a、b は -100〜100、budget は 0〜400 です。

距離は a-b の絶対値です。往復は片道を 2 倍します。最後のメソッドは bool を返します。

a が 2、b が 5 なら Distance は 3 です。往復は 6 です。budget が 5 なら false、6 なら true です。同じ場所なら距離 0 なので、budget が 0 でも true です。

```csharp
public static partial class Answers
{
    public static int Distance(int a, int b)
    {
        if (a >= b) return a - b;
        return b - a;
    }

    public static bool RoundTripFits(int a, int b, int budget)
    {
        int oneWay = Distance(a, b);
        return oneWay * 2 <= budget;
    }
}
```

| 呼び出し | 結果 |
| --- | --- |
| RoundTripFits(2, 5, 5) | false |
| RoundTripFits(2, 5, 6) | true |
| RoundTripFits(2, 2, 0) | true |
| RoundTripFits(-2, 1, 6) | true |

### 参考例　戻り値を捨てない

商品価格へ手数料 20 を加える AddFee を使い、さらに梱包料 30 を加えた金額を PackagedPrice から返します。price は 0〜1000 です。

price が 0 なら AddFee は 20 を返します。その値を保存しないと、price は 0 のままなので、結果は 30 になります。仕様は 50 です。

```csharp
public static partial class Answers
{
    public static int AddFee(int price)
    {
        return price + 20;
    }

    public static int PackagedPrice(int price)
    {
        int withFee = AddFee(price);
        return withFee + 30;
    }
}
```

0 は 50、100 は 150、1000 は 1050 です。
