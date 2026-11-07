// 画面から読む。関数の引数は受け取らない。
// 整数が1つ。ReadLine の戻り値は文字列なので、int.Parse で整数にしてから計算する。
// 答えは WriteLine で1行。偶数判定や合計は、読んだあとに if や for をつなぐ。
// Q09 N を N 回足した値（掛け算せず）
// 構文: for、足す
// 引数: 1行の整数 N
// 出力: N * N
// テスト: 4 → 16 / 1 → 1 / 5 → 25

public static partial class Answers
{
    public static void Q09RepeatAdd()
    {
        int n = int.Parse(Console.ReadLine());
        int s = 0;
        for (int i = 1; i <= n; i++)
        {
            s = s + n;
        }
        Console.WriteLine(s);
    }
}
