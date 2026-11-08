// Q34 増加した回数（右のほうが大きい）
// 1行目 N（2 以上）。2行目 N 個。i と i+1 だけ。二重ループは使わない。
// ループは i < n - 1 まで。
// 構文: >
// 出力: 回数
// テスト: N=4, 3 10 6 20 → 2（3→10, 6→20）

public static partial class Answers
{
    public static void Q34CountUp()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int count = 0;
        for (int i = 0; i < n - 1; i++)
        {
            if (int.Parse(parts[i + 1]) > int.Parse(parts[i]))
            {
                count = count + 1;
            }
        }
        Console.WriteLine(count);
    }
}
