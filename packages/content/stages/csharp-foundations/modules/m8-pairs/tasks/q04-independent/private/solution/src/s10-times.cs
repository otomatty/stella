// S10 掛け算の表
// 1行目H W。行rと列cを1始まりとし、r×cを出す。1行にW個、半角空白で区切り、行末の空白は付けない。1≦H,W≦10。
// 例: 2 3 → 1 2 3 / 2 4 6

public static partial class Answers
{
    public static void S10Times()
    {
        string[] size = Console.ReadLine().Split();
        int h = int.Parse(size[0]);
        int w = int.Parse(size[1]);
        for (int row = 1; row <= h; row++)
        {
            string line = "";
            for (int col = 1; col <= w; col++)
            {
                if (col > 1) line = line + " ";
                line = line + (row * col);
            }
            Console.WriteLine(line);
        }
    }
}
