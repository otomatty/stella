// 到達B 正の合計
// 入力の各行は半角空白区切り。null 入力なし。
// 1行目 N、2行目 N 個の整数。0 より大きい値の合計を表示する。1≦N≦20、各値 -100〜100。

public static partial class Answers
{
    public static void DbSumPositive()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int sum = 0;
        for (int i = 0; i < n; i++)
        {
            int value = int.Parse(parts[i]);
            if (value > 0)
            {
                sum = sum + value;
            }
        }
        Console.WriteLine(sum);
    }
}
