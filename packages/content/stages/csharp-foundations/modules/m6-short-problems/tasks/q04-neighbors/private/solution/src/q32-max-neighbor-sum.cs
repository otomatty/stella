// Q32 隣の和の最大
// 1行目 N（2 以上）。2行目 N 個。i と i+1 だけ。二重ループは使わない。
// ループは i < n - 1 まで。
// 構文: +
// テスト: N=4, 3 10 6 20 → 26

public static partial class Answers
{
    public static void Q32MaxNeighborSum()
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
