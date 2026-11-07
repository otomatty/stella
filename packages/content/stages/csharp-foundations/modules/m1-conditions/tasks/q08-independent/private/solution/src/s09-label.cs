// S09 整理札
// 整数nが2と3の両方で割り切れればboth、2だけならtwo、3だけならthree、どちらでもなければnoneを返す。1≦n≦100。
// 例: 6→both、8→two、9→three、5→none

public static partial class Answers
{
    public static string S09Label(int n)
    {
        if (n % 2 == 0 && n % 3 == 0)
        {
            return "both";
        }
        else if (n % 2 == 0)
        {
            return "two";
        }
        else if (n % 3 == 0)
        {
            return "three";
        }
        else
        {
            return "none";
        }
    }
}
