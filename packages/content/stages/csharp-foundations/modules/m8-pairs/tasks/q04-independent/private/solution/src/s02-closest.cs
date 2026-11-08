// S02 最も近い二品
// 1行目N M、2行目N個の価格A、3行目M個の価格B。各売り場から1個選んだ差の絶対値の最小を表示。1≦N≦20、1≦M≦10、価格は0〜100。
// 例: 2 2 / 2 9 / 5 10 → 1

public static partial class Answers
{
    public static void S02Closest()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int m = int.Parse(header[1]);
        string[] aParts = Console.ReadLine().Split();
        string[] bParts = Console.ReadLine().Split();
        int best = int.Parse(aParts[0]) - int.Parse(bParts[0]);
        if (best < 0) best = -best;
        for (int i = 0; i < n; i++)
        {
            for (int j = 0; j < m; j++)
            {
                int d = int.Parse(aParts[i]) - int.Parse(bParts[j]);
                if (d < 0) d = -d;
                if (d < best) best = d;
            }
        }
        Console.WriteLine(best);
    }
}
