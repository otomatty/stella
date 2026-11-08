// 画面から読む。関数の引数は受け取らない。
// 1行目に N（1〜20）、2行目に N 個の整数を半角空白で区切って入力する。
// 答えは WriteLine で1行。
// Q26 偶数の合計
// 構文: for、余り、足す
// 出力: 合計
// テスト: N=5, 3 9 4 11 6 → 10

public static partial class Answers
{
    public static void Q26SumEvens()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int s = 0;
        for (int i = 0; i < n; i++)
        {
            int value = int.Parse(parts[i]);
            if (value % 2 == 0)
            {
                s = s + value;
            }
        }
        Console.WriteLine(s);
    }
}
