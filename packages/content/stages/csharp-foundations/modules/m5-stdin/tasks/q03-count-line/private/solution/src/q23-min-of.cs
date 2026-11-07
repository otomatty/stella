// 画面から読む。関数の引数は受け取らない。
// 1行目に N（1〜20）、2行目に N 個の整数を半角空白で区切って入力する。
// 答えは WriteLine で1行。
// Q23 最小
// 構文: for、if
// 出力: 最小
// テスト: N=4, 3 9 4 11 → 3 / N=3, 20 2 15 → 2

public static partial class Answers
{
    public static void Q23MinOf()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int m = int.Parse(parts[0]);
        for (int i = 1; i < n; i++)
        {
            int value = int.Parse(parts[i]);
            if (value < m)
            {
                m = value;
            }
        }
        Console.WriteLine(m);
    }
}
