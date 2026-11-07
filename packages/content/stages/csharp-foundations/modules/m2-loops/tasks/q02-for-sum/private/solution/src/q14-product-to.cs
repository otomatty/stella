public static partial class Answers
{
    public static int Q14ProductTo(int n)
    {
        int p = 1;
        for (int i = 1; i <= n; i++)
        {
            p = p * i;
        }
        return p;
    }
}
