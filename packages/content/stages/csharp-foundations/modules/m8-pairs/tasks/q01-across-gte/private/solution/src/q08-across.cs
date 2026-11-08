// Q08 二つの売り場
// 売り場Aから1個、売り場Bから1個を選び、合計価格がK以上となる組の個数を表示する。同じ価格でも別の位置の商品は別の商品。入力は1行目N M K、2行目AのN個の価格、3行目BのM個の価格。1≦N,M≦20、0≦価格,K≦100。
// 例: 3 2 10 / 4 5 6 / 4 5 → 3

public static partial class Answers
{
    public static void Q08Across()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int m = int.Parse(header[1]);
        int k = int.Parse(header[2]);
        string[] aParts = Console.ReadLine().Split();
        string[] bParts = Console.ReadLine().Split();
        int count = 0;
        for (int i = 0; i < n; i++)
        {
            for (int j = 0; j < m; j++)
            {
                if (int.Parse(aParts[i]) + int.Parse(bParts[j]) >= k) count++;
            }
        }
        Console.WriteLine(count);
    }
}
