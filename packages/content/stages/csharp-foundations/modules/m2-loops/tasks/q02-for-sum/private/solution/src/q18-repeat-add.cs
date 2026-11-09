public static partial class Answers
{
    public static int Q18RepeatAdd(int n)
    {
        int s = 0;
        for (int i = 1; i <= n; i++)
        {
            s = s + n;
        }
        return s;
    }
}
