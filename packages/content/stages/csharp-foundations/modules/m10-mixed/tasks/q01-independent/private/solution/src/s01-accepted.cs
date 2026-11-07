// S01 受け付けた注文
// 1行目に在庫xと注文数N。続くN行に注文数量。その時点の在庫以内なら受け付けて数量を引き、足りなければ注文全体を断る。受け付けた注文の件数と最後の在庫を2行表示する。 1≦N≦20、在庫と注文数量は0〜100。
// 例: 8 4 / 3 / 6 / 5 / 1 → 2 / 0

public static partial class Answers
{
    public static void S01Accepted()
    {
        string[] header = Console.ReadLine().Split();
        int stock = int.Parse(header[0]);
        int n = int.Parse(header[1]);
        int accepted = 0;
        for (int i = 0; i < n; i++)
        {
            int order = int.Parse(Console.ReadLine());
            if (order <= stock)
            {
                stock = stock - order;
                accepted = accepted + 1;
            }
        }
        Console.WriteLine(accepted);
        Console.WriteLine(stock);
    }
}
