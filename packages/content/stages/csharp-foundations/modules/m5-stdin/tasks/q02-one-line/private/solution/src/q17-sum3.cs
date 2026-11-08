// 画面から読む。関数の引数は受け取らない。
// 読み方は常に Split。個数が足りる入力だけを使う。
// 1行を空白で分け、int.Parse で整数にする。3つなら3番目も使う。
// 答えは WriteLine で1行。
// Q17 3つの合計
// 構文: Split（3つ）
// 引数: 1行に3つ
// 出力: 合計
// テスト: 1 2 3 → 6 / 0 0 0 → 0 / -1 4 1 → 4

public static partial class Answers
{
    public static void Q17Sum3()
    {
        string[] parts = Console.ReadLine().Split();
        int a = int.Parse(parts[0]);
        int b = int.Parse(parts[1]);
        int c = int.Parse(parts[2]);
        Console.WriteLine(a + b + c);
    }
}
