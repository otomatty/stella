// S08 1回だけ
// 1行目N、2行目0〜9の整数N個。一度だけ出た値を合計して表示。1≦N≦20。
// 例: 5 / 2 2 4 7 7 → 4

public static partial class Answers
{
    public static void S08OnceSum()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int[] cnt = new int[10];
        for (int i = 0; i < n; i++) cnt[int.Parse(parts[i])]++;
        int s = 0;
        for (int v = 0; v <= 9; v++)
            if (cnt[v] == 1) s += v;
        Console.WriteLine(s);
    }
}
