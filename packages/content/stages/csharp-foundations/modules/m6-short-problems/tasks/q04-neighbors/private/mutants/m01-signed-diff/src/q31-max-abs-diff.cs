// Q31 ★ 差の絶対値の最大
// 1行目 N（2 以上）。2行目 N 個。i と i+1 だけ。二重ループは使わない。
// ループは i < n - 1 まで。
// 構文: for、-
// 出力: 最大の差
// テスト: N=4, 3 10 6 20 → 14

public static partial class Answers
{
    public static void Q31MaxAbsDiff()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int best = 0;
        for (int i = 0; i < n - 1; i++)
        {
            int difference = int.Parse(parts[i + 1]) - int.Parse(parts[i]);
            if (difference > best)
            {
                best = difference;
            }
        }
        Console.WriteLine(best);
    }
}
