public class Q31MaxAbsDiffTests
{
    [Theory(DisplayName = "Q31 差の最大")]
    [InlineData("4\n3 10 6 20\n", "14\n")]
    [InlineData("2\n10 3\n", "7\n")]
    [InlineData("2\n5 5\n", "0\n")]
    public void Q31MaxAbsDiff(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q31MaxAbsDiff())));
    }
}
