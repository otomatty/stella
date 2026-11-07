// S10 異なる値の順
// 1行目N、2行目-100〜100の整数N個。重複を取り除き、小さい順に1行ずつ表示。1≦N≦20。
// 例: 5 / -2 8 -2 0 8 → -2 / 0 / 8

public static partial class Answers
{
    public static void S10Unique()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int[] b = new int[n];
        for (int i = 0; i < n; i++) b[i] = int.Parse(parts[i]);
        Array.Sort(b);
        Console.WriteLine(b[0]);
        for (int i = 1; i < n; i++)
            if (b[i] != b[i - 1]) Console.WriteLine(b[i]);
    }
}
