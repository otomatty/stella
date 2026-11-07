public static partial class Answers
{
    public static int Q15SumSquares(int n)
    {
        int s = 0;
        for (int i = 1; i <= n; i++)
        {
            s = s + i * i;
        }
        return s;
    }
}
