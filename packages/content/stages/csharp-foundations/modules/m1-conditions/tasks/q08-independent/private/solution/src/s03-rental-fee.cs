// S03 貸出時間
// 利用分数mを受け取り、15分ごとに100円の料金を返す。端数も15分として数える。0≦m≦120。
// 例: 0→0、15→100、16→200

public static partial class Answers
{
    public static int S03RentalFee(int m)
    {
        if (m % 15 == 0)
        {
            return m / 15 * 100;
        }
        else
        {
            return (m / 15 + 1) * 100;
        }
    }
}
