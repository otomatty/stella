---
sourceRefs: [SRC-mslearn-csharp-arrays-20261106, SRC-mslearn-csharp-comparison-20261106, SRC-mslearn-csharp-containskey-20261106, SRC-mslearn-csharp-dict-keys-20261106, SRC-mslearn-csharp-dictionary-20261106, SRC-mslearn-csharp-for-20261104, SRC-mslearn-csharp-if-20261104, SRC-mslearn-csharp-parse-20261106, SRC-mslearn-csharp-readline-20261106, SRC-mslearn-csharp-sort-20261106, SRC-mslearn-csharp-split-20261106, SRC-mslearn-csharp-string-20261106, SRC-mslearn-console-writeline-20261104]
---
# レッスン9-1 ソートと集計

## このレッスンの目標

- [ ] Array.Sort で小さい順に並べ、欲しい位置を取り出せます。
- [ ] 0〜9 の回数を配列で数え、同数なら小さい値を選べます。
- [ ] 名前を Dictionary のキーにして、件数を調べられます。

## 9-1-1 並べてから位置を見る

> **小さい順にするときは、Array.Sort で並べてから位置を見ます。**

6, 1, 4, 1 を小さい順にすると、1, 1, 4, 6 です。1 が二つあれば、二つとも残ります。Array.Sort は、渡した配列自身の順番を変えます。入力のときの位置が後で要るなら、並べる前に別の配列へ写します。

```csharp
public static partial class Answers
{
    public static void PrintSorted()
    {
        int[] a = { 6, 1, 4, 1 };
        Array.Sort(a);
        for (int i = 0; i < a.Length; i++)
            Console.WriteLine(a[i]);
    }
}
```

出力は 1、1、4、6 の 4 行です。添字は 0 から始まります。小さい順の 2 番目は a[1] です。1 始まりの K 番目なら、並べたあとの a[K - 1] です。

大きい方から取り出すときは、末尾からです。並べたあと、i が 0 なら最後、i が 1 ならその一つ前です。添字は n - 1 - i です。2 と 5 を大きい方から 1 個出すなら 5 です。先頭の a[0] を出すと 2 になります。

標準入力から配列を作るときは、個数を読んで `int[] a = new int[n];` を用意し、各 a[i] へ int.Parse した値を入れます。

## 9-1-2 値を添字にして数える

> **0〜9 の回数は、値を添字にした配列で数えます。**

3, 1, 3, 0 なら、0 が 1 回、1 が 1 回、2 が 0 回、3 が 2 回、4 が 0 回です。配列の位置が値、中身がその値の個数です。0 回の値も残します。

```csharp
public static partial class Answers
{
    public static void PrintFrequency()
    {
        int[] a = { 3, 1, 3, 0 };
        int[] frequency = new int[5];
        for (int i = 0; i < a.Length; i++)
            frequency[a[i]]++;
        for (int value = 0; value < frequency.Length; value++)
            Console.WriteLine(frequency[value]);
    }
}
```

出力は 1、1、0、2、0 の 5 行です。0〜9 なら長さは 10 です。

最も多い値を、同数なら小さい値にするときは、小さい方から見ます。回数がいまの候補より大きいときだけ候補を変えます。同数でも更新すると、大きい値を選びます。

## 9-1-3 名前をキーにする

> **名前ごとの回数は、Dictionary に入れてから読みます。**

キーは探すための名前、値はその名前の回数です。apple, pear, apple なら apple は 2 です。未登録の名前は 0 です。大文字と小文字は区別します。辞書の中の並びは使わず、問題が指定する順に出します。

```csharp
using System.Collections.Generic;

public static partial class Answers
{
    public static void CountQuery()
    {
        string[] words = { "apple", "pear", "apple" };
        Dictionary<string, int> counts = new Dictionary<string, int>();
        for (int i = 0; i < words.Length; i++)
        {
            string name = words[i];
            if (!counts.ContainsKey(name)) counts[name] = 0;
            counts[name]++;
        }
        string query = "apple";
        if (counts.ContainsKey(query)) Console.WriteLine(counts[query]);
        else Console.WriteLine(0);
    }
}
```

出力は 2 です。問い合わせを plum にすると 0 です。未登録のキーを、ContainsKey の前に読むと例外になります。using はファイルの先頭に置きます。

ちょうど 2 回の名前が何種類かを出すときは、全部の名前を読んでから Keys を見ます。途中で 2 回になっても、後で 3 回になることがあります。red, blue, red, green, blue なら、red が 2、blue が 2、green が 1 なので 2 種類です。red が 3 回だけなら 0 種類です。

```csharp
using System.Collections.Generic;

public static partial class Answers
{
    public static void CountExactlyTwo()
    {
        int n = int.Parse(Console.ReadLine());
        Dictionary<string, int> counts = new Dictionary<string, int>();
        for (int i = 0; i < n; i++)
        {
            string name = Console.ReadLine();
            if (!counts.ContainsKey(name)) counts[name] = 0;
            counts[name]++;
        }
        int kinds = 0;
        foreach (string name in counts.Keys)
            if (counts[name] == 2) kinds++;
        Console.WriteLine(kinds);
    }
}
```

counts.Keys は、登録された名前を一つずつ取り出すために使います。同じ名前は一つのキーです。
