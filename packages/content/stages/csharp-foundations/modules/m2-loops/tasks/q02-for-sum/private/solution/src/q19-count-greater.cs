public static partial class Answers
{
    public static int Q19CountGreater(int n, int k)
    {
        int c = 0;
        for (int i = 1; i <= n; i++)
        {
            if (i > k)
            {
                c = c + 1;
            }
        }
        return c;
    }
}
