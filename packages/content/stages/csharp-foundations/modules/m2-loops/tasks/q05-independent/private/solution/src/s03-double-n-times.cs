public static partial class Answers
{
    public static int S03DoubleNTimes(int n)
    {
        int p = 1;
        for (int i = 1; i <= n; i++)
        {
            p = p * 2;
        }
        return p;
    }
}
