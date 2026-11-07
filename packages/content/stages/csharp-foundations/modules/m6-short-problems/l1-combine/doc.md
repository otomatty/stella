---
sourceRefs: [SRC-mslearn-csharp-readline-20261106, SRC-mslearn-csharp-parse-20261106, SRC-mslearn-csharp-split-20261106, SRC-mslearn-csharp-for-20261104, SRC-mslearn-csharp-if-20261104, SRC-mslearn-console-writeline-20261104, SRC-mslearn-csharp-string-20261106, SRC-mslearn-csharp-char-20261106, SRC-mslearn-csharp-arrays-20261106, SRC-mslearn-csharp-comparison-20261106, SRC-mslearn-csharp-boolean-20261106, SRC-mslearn-csharp-length-20261106, SRC-mslearn-csharp-indexer-20261106]
---
# レッスン6-1 短い総合問題

## このレッスンの目標

- [ ] 点数を件数のあとで読み、比較に合う人数を数えられます。
- [ ] 文字列を長さと文字で判定できます。
- [ ] 隣の値を i と i+1 だけで比べられます。

## 6-1-1 点数から人数を数える

> **点数は件数のあとで読み、比較に合う人数を数えます。**

1行目は人数です。2行目に、その人数ぶんの点数が空白で並びます。3行目の比較の基準を閾値と呼びます。以上、より大きい、未満、以下、同じ、は if の比較だけを変えます。合うたびに 1 を足すと人数です。合計点は人数ではなく、同じ読み方で点数を足します。

4 人の点数が 10 20 30 20 で、閾値 20 より大きい人数は 1 です。20 は数えません。答えは個数で、点数の合計ではありません。

```csharp
public static partial class Answers
{
    public static void CountGreater()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int threshold = int.Parse(Console.ReadLine());
        int count = 0;
        for (int i = 0; i < n; i++)
        {
            if (int.Parse(parts[i]) > threshold)
            {
                count = count + 1;
            }
        }
        Console.WriteLine(count);
    }
}
```

## 6-1-2 文字列を判定する

> **文字列は長さと文字で判定し、空は長さ 0 です。**

2行なら、1行目が S、2行目が T です。空行は空文字で、Length は 0 です。中身の一致は ==、長さが同じかは Length です。先頭の 1 文字は、どちらも 1 文字以上のときに s[0] と t[0] です。

1行の文字列は、文字を先頭から見ます。数字は '0' から '9' です。空は長さ 0 なので、全部数字か、は No です。

abc と ab は長さが違うので No です。中身は見ません。

```csharp
public static partial class Answers
{
    public static void SameLength()
    {
        string s = Console.ReadLine();
        string t = Console.ReadLine();
        if (s.Length == t.Length)
        {
            Console.WriteLine("Yes");
        }
        else
        {
            Console.WriteLine("No");
        }
    }
}
```

長さが 3 なら Yes です。中身が数字かは見ません。123 は Yes、12 は No です。

同じ位置の文字を数えるときは、両方の添字を i にします。T の先頭だけと比べると、2文字目以降がずれます。

```csharp
public static partial class Answers
{
    public static void CountSamePosition()
    {
        string s = Console.ReadLine();
        string t = Console.ReadLine();
        int count = 0;
        for (int i = 0; i < s.Length; i++)
        {
            if (s[i] == t[i])
            {
                count = count + 1;
            }
        }
        Console.WriteLine(count);
    }
}
```

ab と ab なら 2 です。空と空なら 0 です。

## 6-1-3 隣の値を比べる

> **隣は i と i+1 だけを比べ、ループは n-1 までです。**

1行目の N は 2 以上、2行目が N 個です。i は 0 から n-2 まで動かします。二重ループは使いません。差が負なら、符号を反転してから最大や合計に使います。

3 10 6 20 の隣の和は 13、16、26 です。最大は 26 です。

```csharp
public static partial class Answers
{
    public static void MaxNeighborSum()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int best = int.Parse(parts[0]) + int.Parse(parts[1]);
        for (int i = 1; i < n - 1; i++)
        {
            int sum = int.Parse(parts[i]) + int.Parse(parts[i + 1]);
            if (sum > best)
            {
                best = sum;
            }
        }
        Console.WriteLine(best);
    }
}
```

基準をまたぐ組は、左が閾値未満、かつ右が閾値以上です。二つの条件が同時に要ります。N が 1 なら隣の組はなく、0 です。値が 8 10 12 9 10 で閾値 10 なら、対象は (8, 10) と (9, 10) で、答えは 2 です。増えた組を全部数えるのではありません。

```csharp
public static partial class Answers
{
    public static void CountCrossed()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int threshold = int.Parse(header[1]);
        string[] parts = Console.ReadLine().Split();
        int count = 0;
        for (int i = 0; i < n - 1; i++)
        {
            int left = int.Parse(parts[i]);
            int right = int.Parse(parts[i + 1]);
            if (left < threshold && right >= threshold)
            {
                count = count + 1;
            }
        }
        Console.WriteLine(count);
    }
}
```
