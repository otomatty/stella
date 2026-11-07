// 画面から読む。関数の引数は受け取らない。
// 整数が1つ。ReadLine の戻り値は文字列なので、int.Parse で整数にしてから計算する。
// 答えは WriteLine で1行。偶数判定や合計は、読んだあとに if や for をつなぐ。
// Q10 1から N の合計
// 構文: for、足す
// 引数: 1行の整数 N
// 出力: 合計
// テスト: 4 → 10 / 1 → 1 / 10 → 55

public static partial class Answers
{
    public static void Q10SumTo()
    {
        int n = int.Parse(Console.ReadLine());
        int s = 0;
        for (int i = 1; i <= n; i++)
        {
            s = s + i;
        }
        Console.WriteLine(s);
    }
}
