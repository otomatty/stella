// 画面から読む。関数の引数は受け取らない。
// 読み方は常に Split。個数が足りる入力だけを使う。
// 1行を空白で分け、int.Parse で整数にする。3つなら3番目も使う。
// 答えは WriteLine で1行。
// Q14 2つの余り（a % b。b は 0 でない）
// 構文: 余り
// 引数: 1行に2つ
// 出力: 余り
// テスト: 12 5 → 2 / 20 6 → 2 / 9 3 → 0

public static partial class Answers
{
    public static void Q14Remainder()
    {
        string[] parts = Console.ReadLine().Split();
        int a = int.Parse(parts[0]);
        int b = int.Parse(parts[1]);
        Console.WriteLine(a % b);
    }
}
