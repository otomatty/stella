// Q36 隣が同じ組の個数
// 1行目 N（2 以上）。2行目 N 個。i と i+1 だけ。二重ループは使わない。
// ループは i < n - 1 まで。
// 構文: ==
// テスト: N=5, 1 1 2 2 2 → 3

public static partial class Answers
{
    public static void Q36CountSame()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int count = 0;
        for (int i = 0; i < n - 1; i++)
        {
            if (int.Parse(parts[i]) == int.Parse(parts[i + 1]))
            {
                count = count + 1;
            }
        }
        Console.WriteLine(count);
    }
}
