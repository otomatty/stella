public static partial class Answers
{
    public static string S08AllInRange(int[] a, int l, int r)
    {
        for (int i = 0; i < a.Length; i++)
        {
            if (a[i] < l || a[i] > r)
            {
                return "no";
            }
        }
        return "yes";
    }
}
