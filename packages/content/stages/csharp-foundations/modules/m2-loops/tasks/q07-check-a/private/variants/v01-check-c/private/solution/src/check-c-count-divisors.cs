public static partial class Answers
{
    public static int CheckCCountDivisors(int n)
    {
        int c = 0;
        for (int i = 1; i <= n; i++)
        {
            if (n % i == 0)
            {
                c = c + 1;
            }
        }
        return c;
    }
}
