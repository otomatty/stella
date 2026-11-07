public class S05ItemTotalsTests
{
    [Theory(DisplayName = "S05 品目の増減")]
    [InlineData("3 2\npen 4\nbook 2\npen -1\npen\neraser\n", "3\n0\n")]
    [InlineData("1 1\npen -3\npen\n", "-3\n")]
    public void S05ItemTotals(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S05ItemTotals())));
    }
}
