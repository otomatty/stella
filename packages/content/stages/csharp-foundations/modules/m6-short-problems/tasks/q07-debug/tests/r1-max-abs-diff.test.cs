public class R1MaxAbsDiffTests
{
    [Theory(DisplayName = "R1 差の最大")]
    [InlineData("2\n10 3\n", "7\n")]
    [InlineData("4\n3 10 6 20\n", "14\n")]
    [InlineData("2\n5 5\n", "0\n")]
    [InlineData("3\n1 2 0\n", "2\n")]
    public void R1MaxAbsDiff(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.R1MaxAbsDiff())));
    }
}
