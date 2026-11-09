// 荷物コードの関数CheckParcel6を作る。引数はstring input、string mode。戻り値は成功が空文字、失敗がErr。ログは指定文を1件1行、記載順に出す。
//
// inputはnullではない任意の0〜30文字の文字列。modeはCheckかImportのみ。有効な荷物コードは半角数字0〜9のみで6文字。先頭0を許可する。空白とは半角空白と全角空白の2種類。
//
// Checkでは、元の入力に空白が1文字でもあれば「空白不可」を出しErrを返す。それ以外で有効なコードでなければ「形式不正」を出してErr。成功時はログなしで空文字。
//
// Importでは、半角・全角空白を位置によらず全て削除する。削除後が有効なコードでなければ「形式不正」を出してErr。削除後が有効で、元の入力から空白を削除した場合だけ「整形しました」を出す。成功時の戻り値は空文字。失敗時に整形ログは出さない。
//
// 例: inputが12 3456でImportなら、整形しました、の1行と空文字。同じ入力でCheckなら、空白不可、の1行とErr。ログに句読点や前後空白は付けない。タブは削除しないため数字以外として不正になる。
//
// この問題の変更点
//
// 有効コードの条件に「先頭が0ではない」を追加する。6文字の半角数字で先頭が0なら「先頭不正」を出してErrとする。半角数字6文字でない場合は先頭を調べず、以前のエラーログだけを出す。
//
// Checkの空白優先は維持する。Importの「整形しました」は、先頭条件も含め最終的に成功した場合だけ出す。
//
// この問題では、変更後の関数をCheckParcel6Change(string input, string mode)として書く。
// 補助の関数を使う場合は、この問題のメソッドの中に書く。

public static partial class Answers
{
    public static string CheckParcel6Change(string input, string mode)
    {
        bool IsDigit6(string value)
        {
            if (value.Length != 6)
            {
                return false;
            }
            for (int i = 0; i < value.Length; i++)
            {
                if (value[i] < '0' || value[i] > '9')
                {
                    return false;
                }
            }
            return true;
        }

        bool hasSpace = input.Contains(" ") || input.Contains("　");
        if (mode == "Check" && hasSpace)
        {
            Console.WriteLine("空白不可");
            return "Err";
        }

        string value = input;
        if (mode == "Import")
        {
            value = input.Replace(" ", "").Replace("　", "");
        }
        if (value[0] == '0')
        {
            Console.WriteLine("先頭不正");
            return "Err";
        }
        if (!IsDigit6(value))
        {
            Console.WriteLine("形式不正");
            return "Err";
        }
        if (mode == "Import" && hasSpace)
        {
            Console.WriteLine("整形しました");
        }
        return "";
    }
}
