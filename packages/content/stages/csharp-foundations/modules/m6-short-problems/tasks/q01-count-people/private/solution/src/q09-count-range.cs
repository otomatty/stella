// Q09 範囲 L 以上 R 以下の人数（3行目 L、4行目 R）
// 1行目 N（1〜20）、2行目に N 個の点数。閾値を使う問だけ 3 行目に読む。Q09 は 3 行目 L、4 行目 R。
// 変えるのは if の比較（>= > < <= ==）だけ。合計点も同じ読み方で、足す。
// 構文: &&
// テスト: N=5, 50 60 80 59 100, L=60, R=80 → 2（60, 80）

public static partial class Answers
{
    public static void Q09CountRange()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int l = int.Parse(Console.ReadLine());
        int r = int.Parse(Console.ReadLine());
        int count = 0;
        for (int i = 0; i < n; i++)
        {
            int score = int.Parse(parts[i]);
            if (score >= l && score <= r)
            {
                count = count + 1;
            }
        }
        Console.WriteLine(count);
    }
}
