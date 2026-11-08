// S04 重複
// 1行目N、2行目0〜9の整数N個。2回以上出た値を小さい順に1行ずつ表示。なければnone。1≦N≦20。
// 例: 5 / 3 1 3 1 9 → 1 / 3

public static partial class Answers
{
    public static void S04Duplicates()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int[] cnt = new int[10];
        for (int i = 0; i < n; i++) cnt[int.Parse(parts[i])]++;
        int found = 0;
        for (int v = 0; v <= 9; v++)
        {
            if (cnt[v] >= 2)
            {
                Console.WriteLine(v);
                found = 1;
            }
        }
        if (found == 0) Console.WriteLine("none");
    }
}
