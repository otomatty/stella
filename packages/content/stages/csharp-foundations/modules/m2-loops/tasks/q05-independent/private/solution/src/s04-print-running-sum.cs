public static partial class Answers
{
    public static void S04PrintRunningSum(int n)
    {
        int s = 0;
        for (int i = 1; i <= n; i++)
        {
            s = s + i;
            Console.WriteLine(s);
        }
    }
}
