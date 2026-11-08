// 画面から読む。関数の引数は受け取らない。
// 1行目に N（1〜20）、2行目に N 個の整数を半角空白で区切って入力する。
// 答えは WriteLine で1行。
// Q25 K 以上の個数（3行目が K）
// 構文: 3行読む
// 引数: 1行目 N、2行目 N 個、3行目 K
// 出力: 個数
// テスト: N=5, 50 60 80 59 100, K=60 → 3
// K が3行目なら、ReadLine をもう1回。

public static partial class Answers
{
    public static void Q25CountGteK()
    {
        int n = int.Parse(Console.ReadLine());
        string[] parts = Console.ReadLine().Split();
        int k = int.Parse(Console.ReadLine());
        int c = 0;
        for (int i = 0; i < n; i++)
        {
            if (int.Parse(parts[i]) >= k)
            {
                c = c + 1;
            }
        }
        Console.WriteLine(c);
    }
}
