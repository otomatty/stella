public static partial class Answers
{
    public static int S01CountBy2Or5(int n)
    {
        int c = 0;
        for (int i = 1; i <= n; i++)
        {
            if (i % 2 == 0 && i % 5 == 0)
            {
                c = c + 1;
            }
        }
        return c;
    }
}
