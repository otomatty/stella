// S01 大きい順
// 1行目N、2行目N個の整数。大きい順に1行ずつ表示。重複も残す。1≦N≦20、値は-100〜100。
// 例: 4 / 2 8 2 5 → 8 / 5 / 2 / 2

public static partial class Answers
{
    public static void S01Descending()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int[] b = new int[n];
        for (int i = 0; i < n; i++) b[i] = int.Parse(parts[i]);
        Array.Sort(b);
        for (int i = 0; i < n; i++) Console.WriteLine(b[i]);
    }
}
