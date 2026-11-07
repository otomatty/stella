// S02 送料
// 1行目が商品金額 p、2行目が送料 s。p が3000以上なら送料無料、それ以外は s を加えて総額を表示する。0≦p,s≦10000。
// 例: 2999 / 500→3499、3000 / 500→3000

public static partial class Answers
{
    public static void S02PayWithShipping()
    {
        int price = int.Parse(Console.ReadLine());
        int shipping = int.Parse(Console.ReadLine());
        if (price >= 3000)
        {
            Console.WriteLine(price);
        }
        else
        {
            Console.WriteLine(price + shipping);
        }
    }
}
