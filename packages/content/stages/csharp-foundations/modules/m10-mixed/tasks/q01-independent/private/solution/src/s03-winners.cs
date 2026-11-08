// S03 同点を含めた上位
// 1行目N K、2行目N個の点数。大きい順でK番目の点数以上の人数と、その人たちの点数合計を2行表示する。1≦K≦N。 Nは20以下、点数は0〜100。
// 例: 4 2 / 90 80 80 50 → 3 / 250

public static partial class Answers
{
    public static void S03Winners()
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
        int count = 0;
        int sum = 0;
        for (int i = 0; i < n; i++)
        {
            if (a[i] >= border)
            {
                count = count + 1;
                sum = sum + a[i];
            }
        }
        Console.WriteLine(count);
        Console.WriteLine(sum);
    }
}
