// S05 文字数制限
// 1行目に N と上限 k、続く N 行に空白を含まない文字列。長さが k 以下の件数を表示する。
// 例: 3 3 / ab / abcd / xyz→2

public static partial class Answers
{
    public static void S05CountLen()
    {
        string[] header = Console.ReadLine().Split();
        int n = int.Parse(header[0]);
        int k = int.Parse(header[1]);
        int count = 0;
        for (int i = 0; i < n; i++)
        {
            string line = Console.ReadLine();
            if (line.Length <= k)
            {
                count = count + 1;
            }
        }
        Console.WriteLine(count);
    }
}
