// S01 追加点
// 1行目に N と基準 p、2行目に N 人の点数。各人が p 点に届くための不足点を合計して表示する。
// 例: 3 60 / 40 60 75→20

public static partial class Answers
{
    public static void S01TotalShortfall()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int p = int.Parse(header[1]);
        string[] parts = Console.ReadLine().Split();
        int sum = 0;
        for (int i = 0; i < n; i++)
        {
            int score = int.Parse(parts[i]);
            if (score < p)
            {
                sum = sum + (p - score);
            }
        }
        Console.WriteLine(sum);
    }
}
