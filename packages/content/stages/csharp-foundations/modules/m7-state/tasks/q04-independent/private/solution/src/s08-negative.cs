// S08 日々の残高
// 1行目に初期残高xとN、続くN行に増減。更新後が負になった回数を表示。初期値は数えない。0≦N≦20、xと増減は-100〜100。
// 例: 1 4 / -3 / 1 / 4 / -5 → 3

public static partial class Answers
{
    public static void S08Negative()
    {
        string[] header = Console.ReadLine().Split();
        int current = int.Parse(header[0]);
        int n = int.Parse(header[1]);
        int count = 0;
        for (int i = 0; i < n; i++)
        {
            current = current + int.Parse(Console.ReadLine());
            if (current < 0)
            {
                count = count + 1;
            }
        }
        Console.WriteLine(count);
    }
}
