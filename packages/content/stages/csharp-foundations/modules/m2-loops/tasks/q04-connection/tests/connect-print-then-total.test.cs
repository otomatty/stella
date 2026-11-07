public class ConnectPrintThenTotalTests
{
    [Theory(DisplayName = "接続 1から n を出して合計")]
    [InlineData(4, "1\n2\n3\n4\n10\n")]
    public void ConnectPrintThenTotal(int n, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => Answers.ConnectPrintThenTotal(n)));
    }
}
