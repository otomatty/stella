// Q22 料金
// 整数 price を受け取り、1000 未満なら cheap、3000 以下なら normal、3000 より大きいなら high を返す。
// 例: 999 → cheap / 1000 → normal / 3000 → normal / 3001 → high

public static partial class Answers
{
    public static string Q22PriceLevel(int price)
    {
        if (price < 1000)
        {
            return "cheap";
        }
        else if (price <= 3000)
        {
            return "normal";
        }
        else
        {
            return "high";
        }
    }
}
