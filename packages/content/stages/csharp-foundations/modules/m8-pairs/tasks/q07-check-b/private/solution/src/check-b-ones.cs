// 確認B
// 1行目H W、続くH行にW個の0か1。全要素が1である行の件数を表示する。1≦H,W≦10。
// 例: 3 2 / 1 1 / 1 0 / 1 1 → 2

public static partial class Answers
{
    public static void CheckBOnes()
    {
        string[] size = Console.ReadLine().Split();
        int h = int.Parse(size[0]);
        int w = int.Parse(size[1]);
        int rows = 0;
        for (int row = 0; row < h; row++)
        {
            string[] parts = Console.ReadLine().Split();
            int all = 1;
            for (int col = 0; col < w; col++)
            {
                if (int.Parse(parts[col]) != 1) all = 0;
            }
            if (all == 1) rows++;
        }
        Console.WriteLine(rows);
    }
}
