// Q33 隣の差の合計（絶対値）
// 1行目 N（2 以上）。2行目 N 個。i と i+1 だけ。二重ループは使わない。
// ループは i < n - 1 まで。
// 構文: +
// テスト: N=4, 3 10 6 20 → 25（7+4+14）

public static partial class Answers
{
    public static void Q33SumAbsDiff()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int sum = 0;
        for (int i = 0; i < n - 1; i++)
        {
            int difference = int.Parse(parts[i + 1]) - int.Parse(parts[i]);
            if (difference < 0)
            {
                difference = -difference;
            }
            sum = sum + difference;
        }
        Console.WriteLine(sum);
    }
}
