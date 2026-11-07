public class S07StreakTests
{
    [Theory(DisplayName = "S07 連続した日数")]
    [InlineData("7 5\n5 6 2 8 9 5 1\n", "3\n")]
    [InlineData("3 5\n1 2 3\n", "0\n")]
    [InlineData("3 5\n5 5 5\n", "3\n")]
    public void S07Streak(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S07Streak())));
    }
}
