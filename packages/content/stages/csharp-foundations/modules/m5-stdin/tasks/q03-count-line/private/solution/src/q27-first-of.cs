// 画面から読む。関数の引数は受け取らない。
// 1行目に N（1〜20）、2行目に N 個の整数を半角空白で区切って入力する。
// 答えは WriteLine で1行。
// Q27 先頭の値を出す（集計しない）
// 構文: Split、先頭
// 出力: 2行目の先頭
// テスト: N=4, 3 9 4 11 → 3

public static partial class Answers
{
    public static void Q27FirstOf()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        if (n < 1)
        {
            return;
        }
        Console.WriteLine(int.Parse(parts[0]));
    }
}
