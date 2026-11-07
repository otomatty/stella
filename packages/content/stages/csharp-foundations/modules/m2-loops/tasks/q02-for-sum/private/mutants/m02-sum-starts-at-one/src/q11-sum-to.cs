public static partial class Answers
{
    public static int Q11SumTo(int n)
    {
        int s = 1;
        for (int i = 1; i <= n; i++)
        {
            s = s + i;
        }
        return s;
    }
}
