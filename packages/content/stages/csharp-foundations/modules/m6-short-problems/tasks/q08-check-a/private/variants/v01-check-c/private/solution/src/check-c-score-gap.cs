// 確認C
// 1行目 N P、2行目 N 個の点数。P 以上の点数の合計から、P 未満の点数の合計を引いて表示する。1≦N≦20、0≦点数,P≦100。
// 例: 4 50 / 40 50 60 10→60

public static partial class Answers
{
    public static void CheckCScoreGap()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int p = int.Parse(header[1]);
        string[] parts = Console.ReadLine().Split();
        int above = 0;
        int below = 0;
        for (int i = 0; i < n; i++)
        {
            int score = int.Parse(parts[i]);
            if (score >= p)
            {
                above = above + score;
            }
            else
            {
                below = below + score;
            }
        }
        Console.WriteLine(above - below);
    }
}
