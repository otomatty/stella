// 画面から読む。関数の引数は受け取らない。
// 1行目に N（1〜20）、2行目に N 個の整数を半角空白で区切って入力する。
// 答えは WriteLine で1行。
// Q30 積
// 構文: for、掛ける
// 出力: 積
// テスト: N=4, 1 2 3 4 → 24 / N=1, 5 → 5

public static partial class Answers
{
    public static void Q30ProductOf()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int product = 1;
        for (int i = 0; i < n; i++)
        {
            product = product * int.Parse(parts[i]);
        }
        Console.WriteLine(product);
    }
}
