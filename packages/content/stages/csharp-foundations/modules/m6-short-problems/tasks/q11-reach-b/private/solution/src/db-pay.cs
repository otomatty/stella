// 到達B 支払額
// 入力の各行は半角空白区切り。null 入力なし。
// 1行に品数nと単価p。n個買うが、5個以上なら合計から100円引く。0≦n≦20、100≦p≦1000。支払額を表示する。

public static partial class Answers
{
    public static void DbPay()
    {
        string[] parts = Console.ReadLine().Split();
        int n = int.Parse(parts[0]);
        int price = int.Parse(parts[1]);
        int total = n * price;
        if (n >= 5)
        {
            total = total - 100;
        }
        Console.WriteLine(total);
    }
}
