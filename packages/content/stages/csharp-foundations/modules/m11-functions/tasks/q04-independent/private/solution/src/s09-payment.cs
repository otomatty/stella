// S09 合計と料金
// 整数配列の合計を返す関数と、金額 3000 以上なら送料 0、それ以外 500 を返す関数を作る。両方を使って商品価格配列の支払総額を返す。価格は 0〜1000。
// 例: [1000,1000,1000]→3000、[800,900]→2200

public static partial class Answers
{
    public static int S09Payment(int[] prices)
    {
        static int SumOf(int[] values)
        {
            int sum = 0;
            for (int i = 0; i < values.Length; i++) sum = sum + values[i];
            return sum;
        }
        static int Shipping(int amount)
        {
            if (amount >= 3000) return 0;
            return 500;
        }
        int total = SumOf(prices);
        return total + Shipping(total);
    }
}
