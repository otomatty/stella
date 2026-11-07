public static partial class Answers
{
    public static int S06SumAbsDiff(int n, int k)
    {
        int s = 0;
        for (int i = 1; i <= n; i++)
        {
            int d = i - k;
            if (d < 0)
            {
                d = -d;
            }
            s = s + d;
        }
        return s;
    }
}
