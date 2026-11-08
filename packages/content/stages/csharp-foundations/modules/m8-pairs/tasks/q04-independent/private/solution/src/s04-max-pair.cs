// S04 同じ売り場の予算
// 1行目N K、2行目N個の価格。異なる二品の合計がK以下となる最大合計を表示。選べる組がなければ-1。1≦N≦20、価格とKは0〜100。
// 例: 4 7 / 2 3 4 8 → 7

public static partial class Answers
{
    public static void S04MaxPair()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int k = int.Parse(header[1]);
        string[] parts = Console.ReadLine().Split();
        int best = -1;
        for (int i = 0; i < n; i++)
        {
            for (int j = i + 1; j < n; j++)
            {
                int s = int.Parse(parts[i]) + int.Parse(parts[j]);
                if (s <= k && s > best) best = s;
            }
        }
        Console.WriteLine(best);
    }
}
