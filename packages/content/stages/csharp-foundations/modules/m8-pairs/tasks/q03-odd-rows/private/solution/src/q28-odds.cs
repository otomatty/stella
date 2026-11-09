// Q28 行ごとの集計
// 表の各行について奇数の個数を表示する。出力はH行。入力は1行目H W、続くH行にそれぞれW個の整数。1≦H,W≦20、0≦値≦100。
// 行が変わったときに、何を初期化するか考える。
// 例: 3 2 / 0 9 / 8 7 / 6 5 → 1 / 1 / 1

public static partial class Answers
{
    public static void Q28Odds()
    {
        string[] size = Console.ReadLine().Split();
        int h = int.Parse(size[0]);
        int w = int.Parse(size[1]);
        for (int row = 0; row < h; row++)
        {
            string[] parts = Console.ReadLine().Split();
            int count = 0;
            for (int col = 0; col < w; col++)
            {
                if (int.Parse(parts[col]) % 2 != 0) count++;
            }
            Console.WriteLine(count);
        }
    }
}
