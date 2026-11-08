// 画面から読む。関数の引数は受け取らない。
// 整数が1つ。ReadLine の戻り値は文字列なので、int.Parse で整数にしてから計算する。
// 答えは WriteLine で1行。偶数判定や合計は、読んだあとに if や for をつなぐ。
// Q02 +1
// 構文: 同じ読み方、足す
// 引数: 1行の整数 N
// 出力: N + 1
// テスト: 7 → 8 / 0 → 1 / -1 → 0

public static partial class Answers
{
    public static void Q02PlusOne()
    {
        int n = int.Parse(Console.ReadLine());
        Console.WriteLine(n + 1);
    }
}
