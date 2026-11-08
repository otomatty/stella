public static partial class Answers
{
    public static int R2CountEvens(int n)
    {
        int count = 0;
        for (int i = 1; i <= n; i++)
        {
            if (i % 2 == 0)
            {
                count++;
            }
        }
        return count;
    }
}
