public static partial class Answers
{
    public static int Q22Min5(int a, int b, int c, int d, int e)
    {
        int m = a;
        if (b > m)
        {
            m = b;
        }
        if (c < m)
        {
            m = c;
        }
        if (d < m)
        {
            m = d;
        }
        if (e < m)
        {
            m = e;
        }
        return m;
    }
}
