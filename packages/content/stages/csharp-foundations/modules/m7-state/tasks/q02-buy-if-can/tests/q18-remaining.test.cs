public class Q18RemainingTests
{
    [Theory(DisplayName = "Q18 残金")]
    [InlineData("4 3\n0\n4\n0\n", "0\n")]
    [InlineData("4 0\n", "4\n")]
    public void Q18Remaining(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q18Remaining())));
    }
}
