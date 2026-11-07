public static partial class Answers
{
    public static int Q25Max4(int a, int b, int c, int d)
    {
        int m = a;
        if (b > m)
        {
            m = b;
        }
        if (c > m)
        {
            m = c;
        }
        if (d > m)
        {
            m = d;
        }
        return m;
    }
}
