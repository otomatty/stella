public static partial class Answers
{
    public static void Q14PrintSumAndMax(int[] a)
    {
        int s = 0;
        int m = a[0];
        for (int i = 0; i < a.Length; i++)
        {
            s = s + a[i];
            if (a[i] > m)
            {
                m = a[i];
            }
        }
        Console.WriteLine(s);
        Console.WriteLine(m);
    }
}
