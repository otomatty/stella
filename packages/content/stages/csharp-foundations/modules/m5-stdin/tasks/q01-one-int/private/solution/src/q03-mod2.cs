// 画面から読む。関数の引数は受け取らない。
// 整数が1つ。ReadLine の戻り値は文字列なので、int.Parse で整数にしてから計算する。
// 答えは WriteLine で1行。偶数判定や合計は、読んだあとに if や for をつなぐ。
// Q03 余り（2で割った）
// 構文: 余り
// 引数: 1行の整数 N
// 出力: N % 2
// テスト: 7 → 1 / 8 → 0 / 0 → 0

public static partial class Answers
{
    public static void Q03Mod2()
    {
        int n = int.Parse(Console.ReadLine());
        Console.WriteLine(n % 2);
    }
}
