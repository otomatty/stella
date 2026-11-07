// S07 条件を満たす行
// 1行目H W K、続くH行にW個の整数。行の合計がK以上の行数を表示。1≦H,W≦10、値とKは-100〜100。
// 例: 2 3 7 / 1 2 3 / 4 0 4 → 1

public static partial class Answers
{
    public static void S07RowSum()
    {
        string[] header = Console.ReadLine().Split();
        int h = int.Parse(header[0]);
        int w = int.Parse(header[1]);
        int k = int.Parse(header[2]);
        int count = 0;
        for (int row = 0; row < h; row++)
        {
            string[] parts = Console.ReadLine().Split();
            int sum = 0;
            for (int col = 0; col < w; col++) sum += int.Parse(parts[col]);
            if (sum >= k) count++;
        }
        Console.WriteLine(count);
    }
}
