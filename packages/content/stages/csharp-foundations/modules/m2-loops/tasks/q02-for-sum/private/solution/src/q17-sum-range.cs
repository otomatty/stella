public static partial class Answers
{
    public static int Q17SumRange(int a, int b)
    {
        int s = 0;
        for (int i = a; i <= b; i++)
        {
            s = s + i;
        }
        return s;
    }
}
