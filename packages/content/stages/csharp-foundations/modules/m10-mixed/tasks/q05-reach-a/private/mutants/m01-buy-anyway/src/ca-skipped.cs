// 到達A 飛ばした件数
// 入力の各行は半角空白区切り。名前は半角英字1〜10文字。null入力なし。
// 1行目に所持金xとN、続くN行に価格。入力順に買える商品だけ買う。買えずに飛ばした件数と、最後の残金を2行表示。0≦N≦20、0≦x,価格≦100。

public static partial class Answers
{
    public static void CaSkipped()
    {
        string[] header = Console.ReadLine().Split();
        int money = int.Parse(header[0]);
        int n = int.Parse(header[1]);
        int skipped = 0;
        for (int i = 0; i < n; i++)
        {
            int price = int.Parse(Console.ReadLine());
            money = money - price;
        }
        Console.WriteLine(skipped);
        Console.WriteLine(money);
    }
}
