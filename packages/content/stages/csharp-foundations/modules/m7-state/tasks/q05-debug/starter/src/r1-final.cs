// R1
// 初期値xに配列changesの増減を順に加え、最後の値を返す。空の配列もある。

public static partial class Answers
{
    public static int R1Final(int x, int[] changes)
    {
        int current = x;
        for (int i = 0; i < changes.Length; i++)
            current = x + changes[i];
        return current;
    }
}
