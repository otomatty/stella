// 画面から読む。関数の引数は受け取らない。
// 1行目に N（1〜20）、2行目に N 個の整数を半角空白で区切って入力する。
// 答えは WriteLine で1行。
// Q24 偶数の個数
// 構文: for、余り
// 出力: 個数
// テスト: N=5, 3 9 4 11 6 → 2 / N=3, 1 3 5 → 0

public static partial class Answers
{
    public static void Q24CountEvens()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int c = 0;
        for (int i = 0; i < n; i++)
        {
            if (int.Parse(parts[i]) % 2 == 0)
            {
                c = c + 1;
            }
        }
        Console.WriteLine(c);
    }
}
