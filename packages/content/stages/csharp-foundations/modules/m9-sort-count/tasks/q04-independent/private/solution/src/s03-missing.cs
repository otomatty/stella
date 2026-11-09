// S03 足りない番号
// 1行目N、2行目0〜9の整数N個。0〜9の中で一度も出なかった最小値を表示。全種類あれば-1。1≦N≦20。
// 例: 4 / 0 1 3 1 → 2

public static partial class Answers
{
    public static void S03Missing()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int[] seen = new int[10];
        for (int i = 0; i < n; i++) seen[int.Parse(parts[i])] = 1;
        for (int v = 0; v <= 9; v++)
        {
            if (seen[v] == 0)
            {
                Console.WriteLine(v);
                return;
            }
        }
        Console.WriteLine(-1);
    }
}
