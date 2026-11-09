public static partial class Answers
{
    public static int R1Sum(int n)
    {
        int total = 0;
        for (int i = 1; i <= n; i++)
        {
            total += i;
        }
        return total;
    }
}
