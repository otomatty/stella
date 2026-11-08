// S03 購入できた個数
// 1行目に所持金xとN、続くN行に価格。買える商品だけ順に買い、買えた件数と残金を2行表示。価格は0〜100。0≦N≦20、所持金は0〜100。
// 例: 10 3 / 6 / 6 / 3 → 2 / 1

public static partial class Answers
{
    public static void S03Bought()
    {
        string[] header = Console.ReadLine().Split();
        int money = int.Parse(header[0]);
        int n = int.Parse(header[1]);
        int bought = 0;
        for (int i = 0; i < n; i++)
        {
            int price = int.Parse(Console.ReadLine());
            if (price <= money)
            {
                money = money - price;
                bought = bought + 1;
            }
        }
        Console.WriteLine(bought);
        Console.WriteLine(money);
    }
}
