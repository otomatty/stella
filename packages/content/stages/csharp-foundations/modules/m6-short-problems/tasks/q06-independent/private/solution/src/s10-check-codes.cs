// S10 申請の確認
// 1行目 N、続く N 行に文字列。すべてが半角数字 4 文字なら OK、1 件でも違えば NG を 1 行表示する。
// 例: 3 / 0123 / 4567 / 89a0→NG

public static partial class Answers
{
    public static void S10CheckCodes()
    {
        int n = int.Parse(Console.ReadLine());
        bool ok = true;
        for (int i = 0; i < n; i++)
        {
            string code = Console.ReadLine();
            if (code.Length != 4)
            {
                ok = false;
                continue;
            }
            for (int j = 0; j < code.Length; j++)
            {
                if (code[j] < '0' || code[j] > '9')
                {
                    ok = false;
                }
            }
        }
        if (ok)
        {
            Console.WriteLine("OK");
        }
        else
        {
            Console.WriteLine("NG");
        }
    }
}
