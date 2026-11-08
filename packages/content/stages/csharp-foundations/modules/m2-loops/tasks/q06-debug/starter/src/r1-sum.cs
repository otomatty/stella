// R1
//
// 1からnの合計を返す。0≦n≦20。

public static partial class Answers
{
    public static int R1Sum(int n)
    {
        int total = 0;
        for (int i = 1; i <= n; i++)
        {
            total = 0;
            total += i;
        }
        return total;
    }
}
