// S09 購入個数
// 1行目N B、2行目N個の価格。小さい価格から順に予算B以内で買える最大個数を表示。各商品は1回だけ。価格とBは0〜100。1≦N≦20。
// 例: 4 8 / 5 2 4 1 → 3

public static partial class Answers
{
    public static void S09Buy()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int budget = int.Parse(header[1]);
        string[] parts = Console.ReadLine().Split();
        int[] b = new int[n];
        for (int i = 0; i < n; i++) b[i] = int.Parse(parts[i]);
        Array.Sort(b);
        int left = budget;
        int c = 0;
        for (int i = 0; i < n; i++)
        {
            if (b[i] <= left)
            {
                left -= b[i];
                c++;
            }
            else break;
        }
        Console.WriteLine(c);
    }
}
