public class S03DailyTotalTests
{
    [Theory(DisplayName = "S03 日別の記録")]
    [InlineData("3\n5\n-2\n4\n", "7\n")]
    [InlineData("0\n", "0\n")]
    [InlineData("1\n0\n", "0\n")]
    public void S03DailyTotal(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S03DailyTotal())));
    }
}
