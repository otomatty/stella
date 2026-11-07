// 画面から読む。関数の引数は受け取らない。
// 整数が1つ。ReadLine の戻り値は文字列なので、int.Parse で整数にしてから計算する。
// 答えは WriteLine で1行。偶数判定や合計は、読んだあとに if や for をつなぐ。
// Q06 N が60以上なら pass、未満なら fail
// 構文: if、以上
// 引数: 1行の整数 N
// 出力: pass / fail
// テスト: 60 → pass / 59 → fail / 100 → pass

public static partial class Answers
{
    public static void Q06PassFail()
    {
        int n = int.Parse(Console.ReadLine());
        if (n >= 60)
        {
            Console.WriteLine("pass");
        }
        else
        {
            Console.WriteLine("fail");
        }
    }
}
