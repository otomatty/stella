public static partial class Answers
{
    public static int Q24Min3(int a, int b, int c)
    {
        int m = a;
        if (b < m)
        {
            m = b;
        }
        if (c < m)
        {
            m = c;
        }
        return m;
    }
}
