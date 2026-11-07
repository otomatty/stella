public static partial class Answers
{
    public static void S06PrintNegCountAndNonnegSum(int[] a)
    {
        int neg = 0;
        int s = 0;
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] < 0)
            {
                neg = neg + 1;
            }
            else
            {
                s = s + a[i];
            }
        }
        Console.WriteLine(neg);
        Console.WriteLine(s);
    }
}
