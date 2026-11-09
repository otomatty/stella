public class Q15RemainingTests
{
    [Theory(DisplayName = "Q15 残金")]
    [InlineData("8 2\n9\n8\n", "0\n")]
    [InlineData("8 0\n", "8\n")]
    public void Q15Remaining(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q15Remaining())));
    }
}
