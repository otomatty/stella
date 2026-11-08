// 画面から読む。関数の引数は受け取らない。
// 整数が1つ。ReadLine の戻り値は文字列なので、int.Parse で整数にしてから計算する。
// 答えは WriteLine で1行。偶数判定や合計は、読んだあとに if や for をつなぐ。
// Q04 偶数なら even、奇数なら odd
// 構文: if、余り
// 引数: 1行の整数 N
// 出力: even または odd
// テスト: 7 → odd / 8 → even / 0 → even

public static partial class Answers
{
    public static void Q04EvenOdd()
    {
        int n = int.Parse(Console.ReadLine());
        if (n % 2 == 0)
        {
            Console.WriteLine("even");
        }
        else
        {
            Console.WriteLine("odd");
        }
    }
}
