// 到達B 行の差
// 入力の各行は半角空白区切り。名前は半角英字1〜10文字。null入力なし。
// 1行目H W、続くH行にW個の整数。各行の最大と最小の差を1行ずつ表示する。1≦H,W≦10、値は-100〜100。

public static partial class Answers
{
    public static void CbRowSpan()
    {
        string[] header = Console.ReadLine().Split();
        int h = int.Parse(header[0]);
        int w = int.Parse(header[1]);
        for (int r = 0; r < h; r++)
        {
            string[] parts = Console.ReadLine().Split();
            int max = int.Parse(parts[0]);
            int min = max;
            for (int c = 1; c < w; c++)
            {
                int value = int.Parse(parts[c]);
                if (value > max) max = value;
                if (value < min) min = value;
            }
            Console.WriteLine(max - min);
        }
    }
}
