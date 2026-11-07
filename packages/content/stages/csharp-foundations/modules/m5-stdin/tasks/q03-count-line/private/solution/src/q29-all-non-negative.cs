// 画面から読む。関数の引数は受け取らない。
// 1行目に N（1〜20）、2行目に N 個の整数を半角空白で区切って入力する。
// 答えは WriteLine で1行。
// Q29 全部 0 以上なら yes、1つでも負なら no
// 構文: for、if、より小さい
// 出力: yes / no
// テスト: N=3, 1 0 2 → yes / N=3, 1 -1 2 → no

public static partial class Answers
{
    public static void Q29AllNonNegative()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        string answer = "yes";
        for (int i = 0; i < n; i++)
        {
            if (int.Parse(parts[i]) < 0)
            {
                answer = "no";
            }
        }
        Console.WriteLine(answer);
    }
}
