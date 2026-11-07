// S07 基準を満たし続けた日数
// 1行目N P、2行目N日分の値。P以上の日が連続した最長日数を表示する。一日も該当しなければ0。 1≦N≦20、値とPは0〜100。
// 例: 7 5 / 5 6 2 8 9 5 1 → 3

public static partial class Answers
{
    public static void S07Streak()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int p = int.Parse(header[1]);
        string[] parts = Console.ReadLine().Split();
        int current = 0;
        int best = 0;
        for (int i = 0; i < n; i++)
        {
            if (int.Parse(parts[i]) >= p)
            {
                current = current + 1;
                if (current > best) best = current;
            }
            else current = 0;
        }
        Console.WriteLine(best);
    }
}
