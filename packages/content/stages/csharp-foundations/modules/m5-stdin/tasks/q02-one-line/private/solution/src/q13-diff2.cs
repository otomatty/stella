// 画面から読む。関数の引数は受け取らない。
// 読み方は常に Split。個数が足りる入力だけを使う。
// 1行を空白で分け、int.Parse で整数にする。3つなら3番目も使う。
// 答えは WriteLine で1行。
// Q13 2つの差（a - b）
// 構文: 引く
// 引数: 1行に2つ
// 出力: 差
// テスト: 12 5 → 7 / 5 12 → -7 / 8 8 → 0

public static partial class Answers
{
    public static void Q13Diff2()
    {
        string[] parts = Console.ReadLine().Split();
        int a = int.Parse(parts[0]);
        int b = int.Parse(parts[1]);
        Console.WriteLine(a - b);
    }
}
