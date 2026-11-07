// S01 床より下へ行かない
// 1行目に初期位置xとN、続くN行に増減。加えた結果が負なら0に戻す。最後の位置を表示する。0≦N≦20、xと増減は-100〜100。
// 例: 2 3 / -5 / 4 / -1 → 3

public static partial class Answers
{
    public static void S01Floor()
    {
        string[] header = Console.ReadLine().Split();
        int current = int.Parse(header[0]);
        int n = int.Parse(header[1]);
        for (int i = 0; i < n; i++)
        {
            current = current + int.Parse(Console.ReadLine());
            if (current < 0)
            {
                current = 0;
            }
        }
        Console.WriteLine(current);
    }
}
