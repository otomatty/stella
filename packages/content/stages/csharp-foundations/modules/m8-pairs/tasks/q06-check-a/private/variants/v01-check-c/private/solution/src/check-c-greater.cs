// 確認C
// 1行目N M、2行目N個の整数A、3行目M個の整数B。Aの値よりBの値が大きい組の個数を表示。1≦N,M≦20。
// 例: 2 2 / 2 5 / 3 6 → 3

public static partial class Answers
{
    public static void CheckCGreater()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int m = int.Parse(header[1]);
        string[] aParts = Console.ReadLine().Split();
        string[] bParts = Console.ReadLine().Split();
        int count = 0;
        for (int i = 0; i < n; i++)
        {
            for (int j = 0; j < m; j++)
            {
                if (int.Parse(aParts[i]) < int.Parse(bParts[j])) count++;
            }
        }
        Console.WriteLine(count);
    }
}
