// S06 列の合計
// 1行目H W、続くH行にW個の整数。各列の合計を左から1行ずつ出す。1≦H,W≦10、値は-100〜100。
// 例: 2 3 / 1 2 3 / 4 5 6 → 5 / 7 / 9

public static partial class Answers
{
    public static void S06ColSum()
    {
        string[] size = Console.ReadLine().Split();
        int h = int.Parse(size[0]);
        int w = int.Parse(size[1]);
        int[] totals = new int[w];
        for (int row = 0; row < h; row++)
        {
            string[] parts = Console.ReadLine().Split();
            for (int col = 0; col < w; col++) totals[col] += int.Parse(parts[col]);
        }
        for (int col = 0; col < w; col++) Console.WriteLine(totals[col]);
    }
}
