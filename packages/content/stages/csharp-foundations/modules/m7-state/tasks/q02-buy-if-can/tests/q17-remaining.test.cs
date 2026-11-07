public class Q17RemainingTests
{
    [Theory(DisplayName = "Q17 残金")]
    [InlineData("15 3\n8\n8\n2\n", "5\n")]
    [InlineData("15 0\n", "15\n")]
    public void Q17Remaining(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q17Remaining())));
    }
}
