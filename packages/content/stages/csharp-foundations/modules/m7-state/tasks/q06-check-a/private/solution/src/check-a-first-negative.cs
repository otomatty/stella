// 確認A
// 1行目初期残高xとN、続くN行に増減。適用後の残高が初めて負になった操作番号を1始まりで表示。なければ-1。初期残高は0〜100。0≦N≦20、増減は-100〜100。
// 例: 3 3 / -2 / -4 / 8 → 2

public static partial class Answers
{
    public static void CheckAFirstNegative()
    {
        string[] header = Console.ReadLine().Split();
        int current = int.Parse(header[0]);
        int n = int.Parse(header[1]);
        int found = -1;
        for (int i = 0; i < n; i++)
        {
            current = current + int.Parse(Console.ReadLine());
            if (found < 0 && current < 0)
            {
                found = i + 1;
            }
        }
        Console.WriteLine(found);
    }
}
