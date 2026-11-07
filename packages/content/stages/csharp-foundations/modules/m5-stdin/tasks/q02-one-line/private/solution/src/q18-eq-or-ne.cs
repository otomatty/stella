// 画面から読む。関数の引数は受け取らない。
// 読み方は常に Split。個数が足りる入力だけを使う。
// 1行を空白で分け、int.Parse で整数にする。3つなら3番目も使う。
// 答えは WriteLine で1行。
// Q18 2つが同じなら eq、違えば ne
// 構文: 等しい
// 引数: 1行に2つ
// 出力: eq / ne
// テスト: 4 4 → eq / 4 5 → ne / 0 0 → eq

public static partial class Answers
{
    public static void Q18EqOrNe()
    {
        string[] parts = Console.ReadLine().Split();
        int a = int.Parse(parts[0]);
        int b = int.Parse(parts[1]);
        if (a == b)
        {
            Console.WriteLine("eq");
        }
        else
        {
            Console.WriteLine("ne");
        }
    }
}
