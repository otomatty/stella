public class CheckBLongestZeroTests
{
    [Theory(DisplayName = "確認B 0の連続")]
    [InlineData("6\n0 0 1 0 0 0\n", "3\n")]
    [InlineData("1\n1\n", "0\n")]
    [InlineData("3\n0 0 0\n", "3\n")]
    [InlineData("4\n0 1 0 1\n", "1\n")]
    public void CheckBLongestZero(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CheckBLongestZero())));
    }
}
