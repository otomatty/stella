public static partial class Answers
{
    public static void Q10PrintAbsDiffs(int[] a)
    {
        for (int i = 0; i < a.Length - 1; i++)
        {
            int d = a[i] - a[i + 1];
            if (d < 0)
            {
                d = -d;
            }
            Console.WriteLine(d);
        }
    }
}
