// 確認C
// 入力は1行目 N、続く N 行に整数 a と b。各行の差の絶対値を1行ずつ表示する。0≦N≦20、a,b は -100〜100。
// 例: 2 / 2 7 / 8 1→5 / 7

public static partial class Answers
{
    public static void CheckCAbsDiff()
    {
        int n = int.Parse(Console.ReadLine());
        for (int i = 0; i < n; i++)
        {
            string[] parts = Console.ReadLine().Split();
            int a = int.Parse(parts[0]);
            int b = int.Parse(parts[1]);
            int diff = a - b;
            if (diff < 0)
            {
                diff = -diff;
            }
            Console.WriteLine(diff);
        }
    }
}
