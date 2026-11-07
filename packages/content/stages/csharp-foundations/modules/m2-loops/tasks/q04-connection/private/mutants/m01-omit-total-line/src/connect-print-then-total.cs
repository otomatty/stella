public static partial class Answers
{
    public static void ConnectPrintThenTotal(int n)
    {
        int s = 0;
        for (int i = 1; i <= n; i++)
        {
            Console.WriteLine(i);
            s = s + i;
        }
    }
}
