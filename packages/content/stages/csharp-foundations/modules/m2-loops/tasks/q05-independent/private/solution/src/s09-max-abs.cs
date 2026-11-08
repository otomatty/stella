public static partial class Answers
{
    public static int S09MaxAbs(int a, int b, int c)
    {
        int absA = a;
        if (absA < 0)
        {
            absA = -absA;
        }

        int m = absA;

        int absB = b;
        if (absB < 0)
        {
            absB = -absB;
        }
        if (absB > m)
        {
            m = absB;
        }

        int absC = c;
        if (absC < 0)
        {
            absC = -absC;
        }
        if (absC > m)
        {
            m = absC;
        }

        return m;
    }
}
