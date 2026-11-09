// 確認A 二品の組
// 1行目N B、2行目N個の価格。異なる二品を買い、予算B以下の組が何組あるかと、その中の最大合計を2行表示。組なしなら0と-1。順序違いは同じ組。1≦N≦20、0≦価格,B≦100。
// 例: 4 7 / 1 3 4 8 → 3 / 7

public static partial class Answers
{
    public static void CheckAPairs()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int budget = int.Parse(header[1]);
        string[] parts = Console.ReadLine().Split();
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = int.Parse(parts[i]);
        int count = 0;
        int best = -1;
        for (int i = 0; i < n; i++)
        {
            for (int j = i + 1; j < n; j++)
            {
                int sum = a[i] + a[j];
                if (sum <= budget)
                {
                    count = count + 1;
                    if (sum > best) best = sum;
                }
            }
        }
        Console.WriteLine(count);
        Console.WriteLine(best);
    }
}
