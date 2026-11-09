// 接続練習
// 画面から読む。関数の引数は受け取らない。
// 構文: ReadLine を N+1 回、if
// 引数: 1行目 N。続く N 行に整数が1つずつ
// 出力: 最大
// テスト: 3 / 8 / 2 / 15 → 15。追加: 先頭が最大 3 / 20 / 2 / 15 → 20

public static partial class Answers
{
    public static void ConnectLineMax()
    {
        int n = int.Parse(Console.ReadLine());
        int max = int.Parse(Console.ReadLine());
        for (int i = 1; i < n; i++)
        {
            int value = int.Parse(Console.ReadLine());
            if (value > max)
            {
                max = value;
            }
        }
        Console.WriteLine(max);
    }
}
