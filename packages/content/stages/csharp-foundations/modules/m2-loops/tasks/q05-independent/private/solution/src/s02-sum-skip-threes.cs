public static partial class Answers
{
    public static int S02SumSkipThrees(int a, int b)
    {
        int s = 0;
        for (int i = a; i <= b; i++)
        {
            if (i % 3 != 0)
            {
                s = s + i;
            }
        }
        return s;
    }
}
