public class Q02YearRangeTests
{
    [Theory(DisplayName = "Q02 年の範囲を足す")]
    [InlineData("19990101", "Check", "Err", "日付が正しくありません\n")]
    [InlineData("19990101", "Import", "Err", "日付が正しくありません\n")]
    [InlineData("1999 0101", "Import", "Err", "空白を削除しました\n日付が正しくありません\n")]
    [InlineData("20000101", "Check", "", "")]
    [InlineData("20000101", "Import", "", "")]
    [InlineData("2000 0101", "Import", "", "空白を削除しました\n")]
    [InlineData("20990101", "Check", "", "")]
    [InlineData("20990101", "Import", "", "")]
    [InlineData("2099 0101", "Import", "", "空白を削除しました\n")]
    [InlineData("21000101", "Check", "Err", "日付が正しくありません\n")]
    [InlineData("21000101", "Import", "Err", "日付が正しくありません\n")]
    [InlineData("2100 0101", "Import", "Err", "空白を削除しました\n日付が正しくありません\n")]
    [InlineData("00000101", "Check", "Err", "日付が正しくありません\n")]
    [InlineData("00000101", "Import", "Err", "日付が正しくありません\n")]
    [InlineData("0000 0101", "Import", "Err", "空白を削除しました\n日付が正しくありません\n")]
    [InlineData("1999 0101", "Check", "Err", "空白を検知しました\n日付が正しくありません\n")]
    [InlineData("2000 0101", "Check", "", "空白を検知しました\n")]
    [InlineData("20001301", "Check", "Err", "日付が正しくありません\n")]
    [InlineData("20990015", "Import", "Err", "日付が正しくありません\n")]
    [InlineData("20000100", "Check", "Err", "日付が正しくありません\n")]
    [InlineData("20991232", "Import", "Err", "日付が正しくありません\n")]
    [InlineData("2000 1332", "Import", "Err", "空白を削除しました\n日付が正しくありません\n")]
    [InlineData("20000231", "Check", "", "")]
    [InlineData("20990231", "Import", "", "")]
    [InlineData("2026093", "Check", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("2026 093", "Import", "Err", "入力値が正しくありません\n")]
    [InlineData("2026090a", "Check", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("2026 090a", "Import", "Err", "入力値が正しくありません\n")]
    [InlineData("", "Check", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("", "Import", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("２０２６０９０３", "Import", "Err", "入力値の桁数が正しくありません\n")]
    [InlineData("2026\t0903", "Check", "Err", "入力値の桁数が正しくありません\n")]
    public void Q02YearRange(string input, string mode, string expectedReturn, string expectedLog)
    {
        string actualReturn = "";
        string actualLog = ConsoleOutput.Capture(() => actualReturn = Answers.Q02YearRange(input, mode));
        Assert.Equal(expectedReturn, actualReturn);
        Assert.Equal(expectedLog, actualLog);
    }
}
