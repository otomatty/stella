// S04 列を選ぶ
// 1行目H W、続くH行にW個の整数。列合計が最大の列の0始まりの番号を表示する。同じ最大合計なら左の列。1≦H,W≦10。 値は0〜100。
// 例: 2 3 / 1 2 3 / 4 3 0 → 0

public static partial class Answers
{
    public static void S04MaxCol()
    {
        string[] header = Console.ReadLine().Split();
        int h = int.Parse(header[0]);
        int w = int.Parse(header[1]);
        int[][] rows = new int[h][];
        for (int r = 0; r < h; r++)
        {
            string[] parts = Console.ReadLine().Split();
            rows[r] = new int[w];
            for (int c = 0; c < w; c++) rows[r][c] = int.Parse(parts[c]);
        }
        int best = -1;
        int bestIndex = 0;
        for (int j = 0; j < w; j++)
        {
            int sum = 0;
            for (int r = 0; r < h; r++) sum = sum + rows[r][j];
            if (best < 0 || sum > best)
            {
                best = sum;
                bestIndex = j;
            }
        }
        Console.WriteLine(bestIndex);
    }
}
