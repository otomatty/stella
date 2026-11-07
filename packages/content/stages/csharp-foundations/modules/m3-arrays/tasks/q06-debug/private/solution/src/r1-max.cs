public static partial class Answers
{
    public static int R1Max(int[] a)
    {
        int answer = a[0];
        for (int i = 1; i < a.Length; i++)
        {
            if (a[i] > answer)
            {
                answer = a[i];
            }
        }
        return answer;
    }
}
