// Q35 減少した回数
// 1行目 N（2 以上）。2行目 N 個。i と i+1 だけ。二重ループは使わない。
// ループは i < n - 1 まで。
// 構文: <
// テスト: N=4, 3 10 6 20 → 1

public static partial class Answers
{
    public static void Q35CountDown()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int count = 0;
        for (int i = 0; i < n - 1; i++)
        {
            if (int.Parse(parts[i + 1]) < int.Parse(parts[i]))
            {
                count = count + 1;
            }
        }
        Console.WriteLine(count);
    }
}
