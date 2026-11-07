// S02 異なる値
// 1行目N、2行目0〜9の整数N個。異なる値が何種類あるか表示。1≦N≦20。
// 例: 5 / 1 1 3 0 3 → 3

public static partial class Answers
{
    public static void S02Distinct()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int[] seen = new int[10];
        for (int i = 0; i < n; i++) seen[int.Parse(parts[i])] = 1;
        int c = 0;
        for (int v = 0; v <= 9; v++) c += seen[v];
        Console.WriteLine(c);
    }
}
