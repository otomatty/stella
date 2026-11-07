// S09 残高と不足
// 1行目に初期残高xとN、続くN行に増減。すべての増減を順に適用する。初期値を含めた最低残高と、更新後に負となった回数を2行表示する。増減は-100〜100、初期残高は0〜100。 1≦N≦20。
// 例: 2 3 / -5 / 2 / 4 → -3 / 2

public static partial class Answers
{
    public static void S09MinBalance()
    {
        string[] header = Console.ReadLine().Split();
        int current = int.Parse(header[0]);
        int n = int.Parse(header[1]);
        int min = current;
        int neg = 0;
        for (int i = 0; i < n; i++)
        {
            current = current + int.Parse(Console.ReadLine());
            if (current < min) min = current;
            if (current < 0) neg = neg + 1;
        }
        Console.WriteLine(min);
        Console.WriteLine(neg);
    }
}
