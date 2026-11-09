// 確認B
// 1行目 N、続く N 行に文字列。半角大文字を 1 文字以上含む文字列の件数を表示する。1≦N≦20、各 0〜20 文字、null なし。
// 例: 3 / aB / AB / xyz→2

public static partial class Answers
{
    public static void CheckBCountUpper()
    {
        int n = int.Parse(Console.ReadLine());
        int count = 0;
        for (int i = 0; i < n; i++)
        {
            string line = Console.ReadLine();
            bool upper = false;
            for (int j = 0; j < line.Length; j++)
            {
                if (line[j] >= 'A' && line[j] <= 'Z')
                {
                    upper = true;
                }
            }
            if (upper)
            {
                count = count + 1;
            }
        }
        Console.WriteLine(count);
    }
}
