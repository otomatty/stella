// S06 得点差
// 1行目 N、続く N 行に得点。最大と最小の差を表示する。1≦N≦20。
// 例: 3 / -5 / -2 / -8→6

public static partial class Answers
{
    public static void S06ScoreRange()
    {
        int n = int.Parse(Console.ReadLine());
        int max = int.Parse(Console.ReadLine());
        int min = max;
        for (int i = 1; i < n; i++)
        {
            int value = int.Parse(Console.ReadLine());
            if (value > max)
            {
                max = value;
            }
            if (value < min)
            {
                min = value;
            }
        }
        Console.WriteLine(max - min);
    }
}
