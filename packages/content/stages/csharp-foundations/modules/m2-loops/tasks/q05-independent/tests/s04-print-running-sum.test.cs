public class S04PrintRunningSumTests
{
    [Theory(DisplayName = "S04 途中の合計")]
    [InlineData(4, "1\n3\n6\n10\n")]
    [InlineData(0, "")]
    [InlineData(1, "1\n")]
    [InlineData(5, "1\n3\n6\n10\n15\n")]
    public void S04PrintRunningSum(int n, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => Answers.S04PrintRunningSum(n)));
    }
}
