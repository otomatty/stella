// S05 行の最大
// 1行目H W、続くH行にW個の整数。各行の最大を1行ずつ出す。1≦H,W≦10、値は-100〜100。
// 例: 2 3 / -5 -2 -8 / 4 4 1 → -2 / 4

public static partial class Answers
{
    public static void S05RowMax()
    {
        string[] size = Console.ReadLine().Split();
        int h = int.Parse(size[0]);
        int w = int.Parse(size[1]);
        for (int row = 0; row < h; row++)
        {
            string[] parts = Console.ReadLine().Split();
            int max = int.Parse(parts[0]);
            for (int col = 1; col < w; col++)
            {
                int value = int.Parse(parts[col]);
                if (value > max) max = value;
            }
            Console.WriteLine(max);
        }
    }
}
