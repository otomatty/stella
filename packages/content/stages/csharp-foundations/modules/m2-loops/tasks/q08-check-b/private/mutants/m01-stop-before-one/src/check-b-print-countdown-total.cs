public static partial class Answers
{
    public static void CheckBPrintCountdownTotal(int n)
    {
        int s = 0;
        for (int i = n; i > 1; i--)
        {
            s = s + i;
            Console.WriteLine(s);
        }
    }
}
