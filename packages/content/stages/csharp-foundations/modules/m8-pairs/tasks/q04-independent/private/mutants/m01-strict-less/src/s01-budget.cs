// S01 予算内の二品
// 1行目N M K、2行目N個の価格A、3行目M個の価格B。各売り場から1個ずつ選び合計がK以下の組の数を表示。1≦N≦20、1≦M≦10、価格とKは0〜100。
// 例: 2 2 6 / 1 4 / 2 5 → 3

public static partial class Answers
{
    public static void S01Budget()
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
                if (int.Parse(aParts[i]) + int.Parse(bParts[j]) < k) count++;
            }
        }
        Console.WriteLine(count);
    }
}
