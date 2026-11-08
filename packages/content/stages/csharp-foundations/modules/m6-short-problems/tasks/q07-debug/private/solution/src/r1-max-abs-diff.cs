// R1
// 1行目 N、2行目 N 個の整数。隣との差の絶対値の最大を表示する。2≦N≦20。

public static partial class Answers
{
    public static void R1MaxAbsDiff()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int best = int.Parse(parts[1]) - int.Parse(parts[0]);
        if (best < 0)
        {
            best = -best;
        }
        for (int i = 1; i < n - 1; i++)
        {
            int difference = int.Parse(parts[i + 1]) - int.Parse(parts[i]);
            if (difference < 0)
            {
                difference = -difference;
            }
            if (difference > best)
            {
                best = difference;
            }
        }
        Console.WriteLine(best);
    }
}
