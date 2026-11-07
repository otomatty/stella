public class Q15ModeTests
{
    [Theory(DisplayName = "Q15 最頻値")]
    [InlineData("3\n8 8 8\n", "8\n")]
    public void Q15Mode(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q15Mode())));
    }
}
