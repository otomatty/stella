// Q38 最後の隣の差
// 1行目 N（2 以上）。2行目 N 個。i と i+1 だけ。二重ループは使わない。
// ループは i < n - 1 まで。
// 構文: 末尾 2 つ
// テスト: N=4, 3 10 6 20 → 14

public static partial class Answers
{
    public static void Q38LastAbsDiff()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int difference = int.Parse(parts[n - 1]) - int.Parse(parts[n - 2]);
        if (difference < 0)
        {
            difference = -difference;
        }
        Console.WriteLine(difference);
    }
}
