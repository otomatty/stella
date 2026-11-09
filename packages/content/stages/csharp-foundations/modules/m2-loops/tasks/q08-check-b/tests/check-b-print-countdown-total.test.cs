public class CheckBPrintCountdownTotalTests
{
    [Theory(DisplayName = "確認B 減らしながらの累計")]
    [InlineData(3, "3\n5\n6\n")]
    [InlineData(0, "")]
    [InlineData(1, "1\n")]
    [InlineData(4, "4\n7\n9\n10\n")]
    public void CheckBPrintCountdownTotal(int n, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => Answers.CheckBPrintCountdownTotal(n)));
    }
}
