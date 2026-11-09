public class CheckParcel6ChangeTests
{
    [Theory(DisplayName = "Q02 仕様Aの変更")]
    [InlineData("123456", "Check", "", "")]
    [InlineData("123456", "Import", "", "")]
    [InlineData("012345", "Check", "Err", "先頭不正\n")]
    [InlineData("12 3456", "Check", "Err", "空白不可\n")]
    [InlineData("12 3456", "Import", "", "整形しました\n")]
    [InlineData("　012345 ", "Import", "Err", "先頭不正\n")]
    [InlineData("12 345", "Import", "Err", "形式不正\n")]
    [InlineData("12 a456", "Check", "Err", "空白不可\n")]
    [InlineData("12 a456", "Import", "Err", "形式不正\n")]
    [InlineData("1234567", "Check", "Err", "形式不正\n")]
    [InlineData("", "Check", "Err", "形式不正\n")]
    [InlineData("", "Import", "Err", "形式不正\n")]
    [InlineData(" ", "Check", "Err", "空白不可\n")]
    [InlineData("　", "Import", "Err", "形式不正\n")]
    [InlineData("１２３４５６", "Import", "Err", "形式不正\n")]
    [InlineData("12\t3456", "Import", "Err", "形式不正\n")]
    [InlineData("012345", "Import", "Err", "先頭不正\n")]
    [InlineData("01 2345", "Check", "Err", "空白不可\n")]
    [InlineData("01 2345", "Import", "Err", "先頭不正\n")]
    [InlineData("01 23", "Import", "Err", "形式不正\n")]
    [InlineData("000000", "Check", "Err", "先頭不正\n")]
    [InlineData("000000", "Import", "Err", "先頭不正\n")]
    public void CheckParcel6Change(string input, string mode, string expectedReturn, string expectedLog)
    {
        string actualReturn = "";
        string actualLog = ConsoleOutput.Capture(() => actualReturn = Answers.CheckParcel6Change(input, mode));
        Assert.Equal(expectedReturn, actualReturn);
        Assert.Equal(expectedLog, actualLog);
    }
}
