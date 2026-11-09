public class Q01ImportLogTimingTests
{
    [Theory(DisplayName = "Q01 削除ログのタイミングを変える")]
    [InlineData("2026 1332", "Import", "Err", "日付が正しくありません\n")]
    [InlineData("2026 0903", "Import", "", "空白を削除しました\n")]
    [InlineData("2026 093", "Import", "Err", "入力値が正しくありません\n")]
    [InlineData("2026 090a", "Import", "Err", "入力値が正しくありません\n")]
    [InlineData("2026090a", "Import", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("2026093", "Import", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("20260903", "Import", "", "")]
    [InlineData("20261301", "Import", "Err", "日付が正しくありません\n")]
    [InlineData("20260015", "Import", "Err", "日付が正しくありません\n")]
    [InlineData("20260900", "Import", "Err", "日付が正しくありません\n")]
    [InlineData("2026　0903", "Import", "", "空白を削除しました\n")]
    [InlineData("　2026 0903 ", "Import", "", "空白を削除しました\n")]
    [InlineData("2026\t0903", "Import", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("２０２６０９０３", "Import", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("", "Import", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("　　　", "Import", "Err", "入力値が正しくありません\n")]
    [InlineData("00000101", "Import", "", "")]
    [InlineData("20260231", "Import", "", "")]
    [InlineData("20260903", "Check", "", "")]
    [InlineData("2026 0903", "Check", "", "空白を検知しました\n")]
    [InlineData("2026 093", "Check", "Err", "空白を検知しました\n入力値が正しくありません\n")]
    [InlineData("2026093", "Check", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("20261301", "Check", "Err", "日付が正しくありません\n")]
    [InlineData("20260900", "Check", "Err", "日付が正しくありません\n")]
    [InlineData("20260231", "Check", "", "")]
    [InlineData("2026 1332", "Check", "Err", "空白を検知しました\n日付が正しくありません\n")]
    [InlineData("　　　", "Check", "Err", "空白を検知しました\n入力値が正しくありません\n")]
    [InlineData("", "Check", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("00000101", "Check", "", "")]
    public void Q01ImportLogTiming(string input, string mode, string expectedReturn, string expectedLog)
    {
        string actualReturn = "";
        string actualLog = ConsoleOutput.Capture(() => actualReturn = Answers.Q01ImportLogTiming(input, mode));
        Assert.Equal(expectedReturn, actualReturn);
        Assert.Equal(expectedLog, actualLog);
    }
}
