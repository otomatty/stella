public static partial class Answers
{
    public static int S03RangeOf(int[] a)
    {
        int max = a[0];
        int min = a[0];
        for (int i = 1; i < a.Length; i++)
        {
            if (a[i] > max)
            {
                max = a[i];
            }
            if (a[i] < min)
            {
                min = a[i];
            }
        }
        return max - min;
    }
}
