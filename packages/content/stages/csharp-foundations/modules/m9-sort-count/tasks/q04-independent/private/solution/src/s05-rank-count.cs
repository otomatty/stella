// S05 順位の人数
// 1行目N K、2行目N個の点数。大きい順でK番目の点数以上の人数を表示。同点の全員を含む。1≦K≦N≦20、点数は-100〜100。
// 例: 4 2 / 90 80 80 50 → 3

public static partial class Answers
{
    public static void S05RankCount()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int k = int.Parse(header[1]);
        string[] parts = Console.ReadLine().Split();
        int[] a = new int[n];
        int[] b = new int[n];
        for (int i = 0; i < n; i++)
        {
            a[i] = int.Parse(parts[i]);
            b[i] = a[i];
        }
        Array.Sort(b);
        int border = b[n - k];
        int c = 0;
        for (int i = 0; i < n; i++)
            if (a[i] >= border) c++;
        Console.WriteLine(c);
    }
}
