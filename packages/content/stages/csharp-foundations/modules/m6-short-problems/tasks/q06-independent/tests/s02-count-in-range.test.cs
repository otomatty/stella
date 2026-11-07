public class S02CountInRangeTests
{
    [Theory(DisplayName = "S02 条件を満たす日")]
    [InlineData("4 10 20\n9 10 20 21\n", "2\n")]
    [InlineData("2 10 20\n10 20\n", "2\n")]
    [InlineData("1 10 20\n1\n", "0\n")]
    public void S02CountInRange(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S02CountInRange())));
    }
}
