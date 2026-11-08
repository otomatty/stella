---
sourceRefs: [SRC-mslearn-csharp-comparison-20261106, SRC-mslearn-csharp-containskey-20261106, SRC-mslearn-csharp-dict-keys-20261106, SRC-mslearn-csharp-dictionary-20261106, SRC-mslearn-csharp-for-20261104, SRC-mslearn-csharp-foreach-20261106, SRC-mslearn-csharp-if-20261104, SRC-mslearn-csharp-parse-20261106, SRC-mslearn-csharp-readline-20261106, SRC-mslearn-csharp-split-20261106, SRC-mslearn-console-writeline-20261104]
---
# レッスン10-1 処理を選んで組み合わせる

## このレッスンの目標

- [ ] 実装の前に、入力、求める答え、条件を書き出せます。
- [ ] 更新を全部終えてから、基準と比べられます。
- [ ] 成り立つと決める前に、全部の要素を見られます。

## 10-1-1 解く前に書き出す

> **実装の前に、入力、求める答え、条件を書き出します。**

問題文から、何が入力で、何を出して、どの条件で処理を分けるかを先に書きます。入力例を手で解き、処理の順番を決めます。選んだ方法で、入力が最大件数のときに何回調べるかも説明します。

実装のあと、指定された例と、自分で作った 3 件で確認します。予想と違うときは、原因を調べて直します。

## 10-1-2 更新してから判定する

> **基準と比べるのは、全部の更新が終わってからです。**

1 行目に記録数 N と基準 T、続く N 行にチーム名と点数の増減を受け取ります。各チームは 0 点から始まります。すべての更新のあと、T 点以上のチーム数を表示します。1≦N≦20、増減と T は -100〜100、名前は半角小文字 1〜10 文字です。入力に現れたチームだけを数えます。

チームごとは、名前をキーにして現在の点数を持つことです。増減は前の点数へ加えます。最新の増減だけで上書きしません。チーム数は、条件に合う記録行の件数ではありません。

T が 5、記録が red +7、blue +4、red -4、blue +2 なら、red は 7 から 3、blue は 4 から 6 へ変わります。最後に基準を満たすのは blue だけで、答えは 1 です。途中の red の 7 点を数えると誤ります。

```csharp
using System.Collections.Generic;

public static partial class Answers
{
    public static void CountTeams()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int threshold = int.Parse(header[1]);
        Dictionary<string, int> totals = new Dictionary<string, int>();
        for (int i = 0; i < n; i++)
        {
            string[] parts = Console.ReadLine().Split();
            string name = parts[0];
            int change = int.Parse(parts[1]);
            if (!totals.ContainsKey(name)) totals[name] = 0;
            totals[name] = totals[name] + change;
        }
        int count = 0;
        foreach (string name in totals.Keys)
            if (totals[name] >= threshold) count++;
        Console.WriteLine(count);
    }
}
```

更新は N 回、最後の判定はチーム数だけです。チーム数は N 以下なので、調べる回数は合わせて最大 2N 回です。

| 入力 | 表示 |
| --- | --- |
| 4 5 / red 7 / blue 4 / red -4 / blue 2 | 1 |
| 1 5 / red 5 | 1 |
| 2 5 / red 7 / red -4 | 0 |
| 2 5 / red 5 / blue 6 | 2 |

## 10-1-3 全部見てから決める

> **成り立つと決めるのは、全部の要素を見てからです。**

整数配列の全要素が 0 以上 100 以下なら true、一つでも範囲外なら false を返します。空の配列なら true です。

範囲外を一つ見つければ false と決められます。true と決めるには、全要素の確認が必要です。範囲内の要素を見た直後に true を返すと、後ろの範囲外を調べません。10 と 101 では、10 の直後に true を返すと 101 を見ず、結果が true になります。仕様は false です。

```csharp
public static partial class Answers
{
    public static bool ValidScores(int[] a)
    {
        foreach (int score in a)
        {
            if (score < 0 || score > 100) return false;
        }
        return true;
    }
}
```

成功の return は、繰り返しの外へ置きます。空の配列は繰り返しに入らないので true です。0 と 100 は範囲内です。-1 は範囲外です。
