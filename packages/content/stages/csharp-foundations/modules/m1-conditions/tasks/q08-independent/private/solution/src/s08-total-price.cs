// S08 追加料金
// 利用個数nを受け取り、最初の3個は1個100円、4個目以降は1個80円として総額を返す。0≦n≦30。
// 例: 3→300、4→380、0→0

public static partial class Answers
{
    public static int S08TotalPrice(int n)
    {
        if (n <= 3)
        {
            return n * 100;
        }
        else
        {
            return 300 + (n - 3) * 80;
        }
    }
}
