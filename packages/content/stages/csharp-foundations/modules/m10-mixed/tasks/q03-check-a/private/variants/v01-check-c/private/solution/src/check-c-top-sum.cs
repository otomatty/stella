// 確認C 上位の合計
// 1行目N K、2行目N個の得点。大きい順のK番目以上の得点合計を表示。同点も全員を含む。1≦K≦N≦20、点数は0〜100。
// 例: 4 2 / 90 80 80 50 → 250

public static partial class Answers
{
    public static void CheckCTopSum()
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
        int sum = 0;
        for (int i = 0; i < n; i++)
            if (a[i] >= border) sum = sum + a[i];
        Console.WriteLine(sum);
    }
}
