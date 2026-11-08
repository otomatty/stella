// 画面から読む。関数の引数は受け取らない。
// 読み方は常に Split。個数が足りる入力だけを使う。
// 1行を空白で分け、int.Parse で整数にする。3つなら3番目も使う。
// 答えは WriteLine で1行。
// Q19 かつ（どちらも 10 より大きいなら both、それ以外は no）
// 構文: かつ、より大きい
// 引数: 1行に2つ
// 出力: both / no
// テスト: 11 12 → both / 11 10 → no / 10 12 → no

public static partial class Answers
{
    public static void Q19BothGreater10()
    {
        string[] parts = Console.ReadLine().Split();
        int a = int.Parse(parts[0]);
        int b = int.Parse(parts[1]);
        if (a > 10 && b > 10)
        {
            Console.WriteLine("both");
        }
        else
        {
            Console.WriteLine("no");
        }
    }
}
