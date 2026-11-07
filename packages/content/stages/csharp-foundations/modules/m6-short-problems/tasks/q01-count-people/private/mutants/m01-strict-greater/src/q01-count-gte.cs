// Q01 ★ P 以上の人数
// 1行目 N（1〜20）、2行目に N 個の点数。閾値を使う問だけ 3 行目に読む。Q09 は 3 行目 L、4 行目 R。
// 変えるのは if の比較（>= > < <= ==）だけ。合計点も同じ読み方で、足す。
// 構文: 3行読む、for、>=
// 出力: 個数
// テスト: N=5, 50 60 80 59 100, P=60 → 3

public static partial class Answers
{
    public static void Q01CountGte()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int p = int.Parse(Console.ReadLine());
        int count = 0;
        for (int i = 0; i < n; i++)
        {
            int score = int.Parse(parts[i]);
            if (score > p)
            {
                count = count + 1;
            }
        }
        Console.WriteLine(count);
    }
}
