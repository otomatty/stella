public static partial class Answers
{
    public static int CheckASumExceptFours(int n)
    {
        int s = 0;
        for (int i = 1; i <= n; i++)
        {
            if (i % 4 != 0)
            {
                s = s + i;
            }
        }
        return s;
    }
}
