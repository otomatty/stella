// S03 記録の変化
// 1行目 N、2行目 N 個の整数。隣との差の絶対値を合計して表示する。N=1 なら 0。
// 例: 4 / 5 2 2 8→9

public static partial class Answers
{
    public static void S03SumAbsDiff()
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
