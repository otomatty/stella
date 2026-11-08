// 確認C
// 整数priceを受け取り、2000未満ならそのまま、2000以上なら300引いた額を返す。0≦price≦10000。
// 例: 2500→2200

public static partial class Answers
{
    public static int CheckCDiscount(int price)
    {
        if (price <= 2000)
        {
            return price;
        }
        else
        {
            return price - 300;
        }
    }
}
