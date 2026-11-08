// 画面から読む。関数の引数は受け取らない。
// 1行目に N（1〜20）、2行目に N 個の整数を半角空白で区切って入力する。
// 答えは WriteLine で1行。
// Q21 ★ 合計
// 構文: ReadLine 2回、Split、for
// 引数: 1行目 N、2行目 N 個
// 出力: 合計
// テスト: N=4, 3 9 4 11 → 27 / N=1, 8 → 8

public static partial class Answers
{
    public static void Q21SumOf()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int s = 0;
        for (int i = 0; i < n; i++)
        {
            s = s + int.Parse(parts[i]);
        }
        Console.WriteLine(s);
    }
}
