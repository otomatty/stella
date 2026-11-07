// 確認B 小さいK個の合計
// 1行目N K、2行目N個の整数。小さい順のK個を合計して表示。重複も別要素。1≦K≦N≦20、値は-100〜100。
// 例: 4 2 / 5 1 3 1 → 2

public static partial class Answers
{
    public static void CheckBSmallSum()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int k = int.Parse(header[1]);
        string[] parts = Console.ReadLine().Split();
        int[] b = new int[n];
        for (int i = 0; i < n; i++) b[i] = int.Parse(parts[i]);
        Array.Sort(b);
        int sum = 0;
        for (int i = 0; i < k; i++) sum += b[i];
        Console.WriteLine(sum);
    }
}
