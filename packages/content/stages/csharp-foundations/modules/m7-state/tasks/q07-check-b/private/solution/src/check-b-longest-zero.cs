// 確認B
// 1行目N、2行目N個の0か1。0が連続した最長の個数を表示。1≦N≦20。
// 例: 6 / 0 0 1 0 0 0 → 3

public static partial class Answers
{
    public static void CheckBLongestZero()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int current = 0;
        int best = 0;
        for (int i = 0; i < n; i++)
        {
            if (int.Parse(parts[i]) == 0)
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
