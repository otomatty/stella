// 確認B 基準未満
// 1行目N P、2行目N個の値。Pより小さい値が連続した最長の個数と、Pより小さい値の総個数を2行表示。1≦N≦20、値とPは0〜100。
// 例: 6 5 / 1 2 8 3 4 1 → 3 / 5

public static partial class Answers
{
    public static void CheckBBelow()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int p = int.Parse(header[1]);
        string[] parts = Console.ReadLine().Split();
        int current = 0;
        int best = 0;
        int total = 0;
        for (int i = 0; i < n; i++)
        {
            if (int.Parse(parts[i]) < p)
            {
                current = current + 1;
                total = total + 1;
                if (current > best) best = current;
            }
            else current = 0;
        }
        Console.WriteLine(best);
        Console.WriteLine(total);
    }
}
