public static partial class Answers
{
    public static int Q16CountThrees(int n)
    {
        int c = 0;
        for (int i = 1; i <= n; i++)
        {
            if (i % 3 == 0)
            {
                c = c + 1;
            }
        }
        return c;
    }
}
