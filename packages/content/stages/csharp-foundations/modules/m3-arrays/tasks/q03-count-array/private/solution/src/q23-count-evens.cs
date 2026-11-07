public static partial class Answers
{
    public static int Q23CountEvens(int[] a)
    {
        int c = 0;
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] % 2 == 0)
            {
                c = c + 1;
            }
        }
        return c;
    }
}
