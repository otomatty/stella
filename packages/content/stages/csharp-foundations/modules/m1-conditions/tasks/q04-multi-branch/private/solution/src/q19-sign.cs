// Q19 ★ 正負とゼロ
// 整数 n を受け取り、負なら negative、0 なら zero、正なら positive を返す。
// 例: -3 → negative / 0 → zero / 8 → positive

public static partial class Answers
{
    public static string Q19Sign(int n)
    {
        if (n < 0)
        {
            return "negative";
        }
        else if (n == 0)
        {
            return "zero";
        }
        else
        {
            return "positive";
        }
    }
}
