// 画面から読む。関数の引数は受け取らない。
// 読み方は常に Split。個数が足りる入力だけを使う。
// 1行を空白で分け、int.Parse で整数にする。3つなら3番目も使う。
// 答えは WriteLine で1行。
// Q20 割り切れるか（a が b で割り切れるなら Yes）
// 構文: 余り
// 引数: 1行に整数 a と b（b は 0 でない）
// 出力: Yes / No
// テスト: 9 3 → Yes / 10 3 → No / 0 5 → Yes

public static partial class Answers
{
    public static void Q20Divisible()
    {
        string[] parts = Console.ReadLine().Split();
        int a = int.Parse(parts[0]);
        int b = int.Parse(parts[1]);
        if (a % b == 0)
        {
            Console.WriteLine("Yes");
        }
        else
        {
            Console.WriteLine("No");
        }
    }
}
