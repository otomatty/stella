// S06 二品の購入
// 1行目N B、2行目N個の価格。異なる二つの位置の商品を買う。予算B以下となる最大合計を表示する。買える組がなければ-1。同じ価格の別商品も選べる。N=1なら-1。 1≦N≦20、価格とBは0〜100。
// 例: 4 10 / 6 3 5 8 → 9

public static partial class Answers
{
    public static void S06PairSum()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int budget = int.Parse(header[1]);
        string[] parts = Console.ReadLine().Split();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = int.Parse(parts[i]);
        int best = -1;
        for (int i = 0; i < n; i++)
        {
            for (int j = i + 1; j < n; j++)
            {
                int sum = a[i] + a[j];
                if (sum <= budget && sum > best) best = sum;
            }
        }
        Console.WriteLine(best);
    }
}
