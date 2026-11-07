// Q13 最頻値
// 0〜9の整数がN個ある。最も多く出た値を表示する。同数なら小さい値を選ぶ。入力は1行目N、2行目N個の整数。1≦N≦20。
// 例: 4 / 0 0 1 1 → 0

public static partial class Answers
{
    public static void Q13Mode()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int[] cnt = new int[10];
        for (int i = 0; i < n; i++) cnt[int.Parse(parts[i])]++;
        int bestVal = 0;
        int bestCnt = cnt[0];
        for (int v = 1; v <= 9; v++)
        {
            if (cnt[v] >= bestCnt)
            {
                bestCnt = cnt[v];
                bestVal = v;
            }
        }
        Console.WriteLine(bestVal);
    }
}
