// 接続練習
// 1行目 N（1〜20）、2行目に N 個の点数。閾値を使う問だけ 3 行目に読む。Q09 は 3 行目 L、4 行目 R。
// 変えるのは if の比較（>= > < <= ==）だけ。合計点も同じ読み方で、足す。
// Q01 と同じ入力で、P 未満の人数。Q01 のコードを閉じて書く。
// 入力 N=5, 50 60 80 59 100, P=60 → 2

public static partial class Answers
{
    public static void ConnectCountLt()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int p = int.Parse(Console.ReadLine());
        int count = 0;
        for (int i = 0; i < n; i++)
        {
            int score = int.Parse(parts[i]);
            if (score < p)
            {
                count = count + 1;
            }
        }
        Console.WriteLine(count);
    }
}
