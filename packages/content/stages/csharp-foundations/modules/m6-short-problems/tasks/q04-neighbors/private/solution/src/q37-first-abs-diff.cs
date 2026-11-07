// Q37 最初の隣の差（絶対値）だけ出す
// 1行目 N（2 以上）。2行目 N 個。i と i+1 だけ。二重ループは使わない。
// ループは i < n - 1 まで。
// 構文: a[0] と a[1]
// テスト: N=4, 3 10 6 20 → 7

public static partial class Answers
{
    public static void Q37FirstAbsDiff()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int difference = int.Parse(parts[1]) - int.Parse(parts[0]);
        if (difference < 0)
        {
            difference = -difference;
        }
        Console.WriteLine(difference);
    }
}
