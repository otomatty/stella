// 確認A 2回以上の種類
// 1行目N、2行目0〜9の整数N個。2回以上現れた値が何種類あるか表示。1≦N≦20。
// 例: 6 / 1 1 2 3 3 3 → 2

public static partial class Answers
{
    public static void CheckAKinds()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int[] cnt = new int[10];
        for (int i = 0; i < n; i++) cnt[int.Parse(parts[i])]++;
        int kinds = 0;
        for (int v = 0; v <= 9; v++)
            if (cnt[v] >= 2) kinds += cnt[v];
        Console.WriteLine(kinds);
    }
}
