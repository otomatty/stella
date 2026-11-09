// Q02 年の範囲を足す
//
// 元の仕様
// 関数CheckDate8にstring strInputとstring strModeを渡す。戻り値は成功が空文字、失敗がErr。
//
// 前提
//
// 入力はnullではない文字列。空文字・数字以外も検証する。モードはCheckかImportのみ。
// 空白は半角空白と全角空白。全位置から削除する。タブは削除しない。
// 数字8桁とは、長さ8で、すべて半角0〜9であること。全角数字は不正。
// 日付は先頭4桁が年、次2桁が月、最後2桁が日。月01〜12、日01〜31だけを確認する。
// この問題では年の範囲、月の日数、うるう年を見ない。00000101と20260231も成功する。
//
// Check
//
// 1. 元の入力に空白があるなら「空白を検知しました」を出し、全空白を削除する。
// 2. 数字8桁でなければ、元の空白があった場合は「入力値が正しくありません」、なかった場合は「入力値の桁数が正しくありません」を出しErrを返す。ここで日付の検証は行わない。
// 3. 数字8桁なら日付を確認する。不正なら「日付が正しくありません」を出しErrを返す。正しければ空文字を返す。
//
// Import
//
// 1. 元の入力に空白があるなら全空白を削除する。検知ログは出さない。
// 2. 数字8桁でなければ、元の空白があった場合は「入力値が正しくありません」、なかった場合は「入力値の桁数が正しくありません」を出しErrを返す。削除ログと日付ログは出さない。
// 3. 数字8桁で、元の入力に空白があった場合は「空白を削除しました」を出す。
// 4. 日付を確認する。不正なら「日付が正しくありません」を出しErrを返す。正しければ空文字を返す。
//
// Importの削除ログは数字8桁を確認した時点で出す。その後に日付で失敗しても、削除ログは取り消さない。ログは各1行、指定文以外は出さない。
//
// この問題の変更点
// 元の関数をコピーし、年2000〜2099のみ成功という条件を追加する。それ以外の年は「日付が正しくありません」でErr。元のImport削除ログのタイミングは維持する。1999、2000、2099、2100、0000を使って確認する。
//
// Substringで一部を切る書き方と、int.Parseで整数にする書き方は調べてよい。短い文字列や数字以外を、先に切り出し・変換して例外にしない。
// 補助の関数を使う場合は、この問題のメソッドの中に書く。

public static partial class Answers
{
    public static string Q02YearRange(string strInput, string strMode)
    {
        bool IsDigitN(string s, int n)
        {
            if (s.Length != n)
            {
                return false;
            }
            for (int i = 0; i < s.Length; i++)
            {
                if (s[i] < '0' || s[i] > '9')
                {
                    return false;
                }
            }
            return true;
        }

        bool IsDate8(string s)
        {
            int year = int.Parse(s.Substring(0, 4));
            int month = int.Parse(s.Substring(4, 2));
            int day = int.Parse(s.Substring(6, 2));
            if (year < 2000 || year > 2099)
            {
                return false;
            }
            if (month < 1 || month > 12)
            {
                return false;
            }
            if (day < 1 || day > 31)
            {
                return false;
            }
            return true;
        }

        string strResult = "";
        bool hasSpace = strInput.Contains(" ") || strInput.Contains("　");
        string s = strInput.Replace(" ", "").Replace("　", "");

        if (strMode == "Check")
        {
            if (hasSpace)
            {
                Console.WriteLine("空白を検知しました");
            }
            if (!IsDigitN(s, 8))
            {
                if (hasSpace)
                {
                    Console.WriteLine("入力値が正しくありません");
                }
                else
                {
                    Console.WriteLine("入力値の桁数が正しくありません");
                }
                return "Err";
            }
            if (!IsDate8(s))
            {
                Console.WriteLine("日付が正しくありません");
                return "Err";
            }
            return "";
        }

        // Import
        if (!IsDigitN(s, 8))
        {
            if (hasSpace)
            {
                Console.WriteLine("入力値が正しくありません");
            }
            else
            {
                Console.WriteLine("入力値の桁数が正しくありません");
            }
            return "Err";
        }
        if (hasSpace)
        {
            Console.WriteLine("空白を削除しました");
        }
        if (!IsDate8(s))
        {
            Console.WriteLine("日付が正しくありません");
            return "Err";
        }
        return strResult;
    }
}
