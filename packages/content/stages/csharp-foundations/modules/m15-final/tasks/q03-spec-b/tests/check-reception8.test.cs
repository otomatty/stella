public class CheckReception8Tests
{
    [Theory(DisplayName = "Q03 仕様B 受付コード")]
    [InlineData("01123456", "Check", "", "")]
    [InlineData("12000000", "Import", "", "")]
    [InlineData("00123456", "Check", "Err", "部署不正\n")]
    [InlineData("13123456", "Import", "Err", "部署不正\n")]
    [InlineData("01 123456", "Check", "", "空白除去\n")]
    [InlineData("01 123456", "Import", "Err", "形式不正\n")]
    [InlineData("13 123456", "Check", "Err", "空白除去\n部署不正\n")]
    [InlineData("01 12345", "Check", "Err", "空白除去\n形式不正\n")]
    [InlineData("01a23456", "Check", "Err", "形式不正\n")]
    [InlineData("0a123456", "Import", "Err", "形式不正\n")]
    [InlineData("", "Check", "Err", "形式不正\n")]
    [InlineData("　", "Check", "Err", "空白除去\n形式不正\n")]
    [InlineData("　", "Import", "Err", "形式不正\n")]
    [InlineData("　01123456 ", "Check", "", "空白除去\n")]
    [InlineData("０１１２３４５６", "Import", "Err", "形式不正\n")]
    [InlineData("01\t123456", "Check", "Err", "形式不正\n")]
    public void CheckReception8(string input, string mode, string expectedReturn, string expectedLog)
    {
        string actualReturn = "";
        string actualLog = ConsoleOutput.Capture(() => actualReturn = Answers.CheckReception8(input, mode));
        Assert.Equal(expectedReturn, actualReturn);
        Assert.Equal(expectedLog, actualLog);
    }
}
