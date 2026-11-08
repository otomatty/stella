public static partial class Answers
{
    public static int S05LastMultipleOf7(int n)
    {
        int last = 0;
        for (int i = 1; i <= n; i++)
        {
            if (i % 7 == 0)
            {
                last = i;
            }
        }
        return last;
    }
}
