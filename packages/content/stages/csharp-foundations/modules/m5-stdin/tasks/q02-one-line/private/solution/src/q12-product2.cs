// 画面から読む。関数の引数は受け取らない。
// 読み方は常に Split。個数が足りる入力だけを使う。
// 1行を空白で分け、int.Parse で整数にする。3つなら3番目も使う。
// 答えは WriteLine で1行。
// Q12 2つの積
// 構文: 掛ける
// 引数: 1行に2つ
// 出力: 積
// テスト: 3 10 → 30 / 0 5 → 0 / -2 4 → -8

public static partial class Answers
{
    public static void Q12Product2()
    {
        string[] parts = Console.ReadLine().Split();
        int a = int.Parse(parts[0]);
        int b = int.Parse(parts[1]);
        Console.WriteLine(a * b);
    }
}
