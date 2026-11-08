// 画面から読む。関数の引数は受け取らない。
// 整数が1つ。ReadLine の戻り値は文字列なので、int.Parse で整数にしてから計算する。
// 答えは WriteLine で1行。偶数判定や合計は、読んだあとに if や for をつなぐ。
// Q01 ★ 2倍
// 構文: ReadLine、int.Parse、掛ける
// 引数: 1行の整数 N
// 出力: N * 2
// テスト: 7 → 14 / 0 → 0 / -3 → -6

public static partial class Answers
{
    public static void Q01Twice()
    {
        int n = int.Parse(Console.ReadLine());
        Console.WriteLine(n);
    }
}
