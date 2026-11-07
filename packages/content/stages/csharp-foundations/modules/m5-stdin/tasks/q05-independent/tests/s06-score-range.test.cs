public class S06ScoreRangeTests
{
    [Theory(DisplayName = "S06 得点差")]
    [InlineData("3\n-5\n-2\n-8\n", "6\n")]
    [InlineData("1\n10\n", "0\n")]
    [InlineData("2\n1\n9\n", "8\n")]
    public void S06ScoreRange(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S06ScoreRange())));
    }
}
