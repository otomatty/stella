// S06 連続の記録
// 1行目N、2行目N個の0または1。1が連続した個数の最大を表示。Nは1以上。Nは20以下。
// 例: 7 / 1 1 0 1 1 1 0 → 3

public static partial class Answers
{
    public static void S06Ones()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int current = 0;
        int best = 0;
        for (int i = 0; i < n; i++)
        {
            if (int.Parse(parts[i]) == 1)
            {
                current = current + 1;
                if (current > best)
                {
                    best = current;
                }
            }
            else
            {
                current = 0;
            }
        }
        Console.WriteLine(best);
    }
}
