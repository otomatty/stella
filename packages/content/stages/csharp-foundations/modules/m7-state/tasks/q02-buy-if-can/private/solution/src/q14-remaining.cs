// 所持金xから、入力順に商品を買う。価格がその時点の所持金以下なら買って引く。買えなければ所持金を変えず次へ進む。最後の所持金を表示する。
// 入力は1行目xとN、続くN行に価格。0≦N≦20、0≦x,価格≦100。
// 購入できるかを毎回の所持金で判断する。
// 例: 20 3 / 3 / 4 / 5 → 8

public static partial class Answers
{
    public static void Q14Remaining()
    {
        string[] header = Console.ReadLine().Split();
        int money = int.Parse(header[0]);
        int n = int.Parse(header[1]);
        for (int i = 0; i < n; i++)
        {
            int price = int.Parse(Console.ReadLine());
            if (price <= money)
            {
                money = money - price;
            }
        }
        Console.WriteLine(money);
    }
}
