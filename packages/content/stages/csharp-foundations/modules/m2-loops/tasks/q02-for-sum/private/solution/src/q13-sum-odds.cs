public static partial class Answers
{
    public static int Q13SumOdds(int n)
    {
        int s = 0;
        for (int i = 1; i <= n; i++)
        {
            if (i % 2 != 0)
            {
                s = s + i;
            }
        }
        return s;
    }
}
