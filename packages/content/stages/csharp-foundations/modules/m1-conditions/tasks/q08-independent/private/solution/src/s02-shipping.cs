// S02 箱の送料
// 重さwを受け取り、2以下は400、5以下は700、それより重ければ1000を返す。1≦w≦10。
// 例: 2→400、3→700、6→1000

public static partial class Answers
{
    public static int S02Shipping(int w)
    {
        if (w <= 2)
        {
            return 400;
        }
        else if (w <= 5)
        {
            return 700;
        }
        else
        {
            return 1000;
        }
    }
}
