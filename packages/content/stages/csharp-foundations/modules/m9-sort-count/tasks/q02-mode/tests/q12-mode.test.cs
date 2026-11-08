public class Q12ModeTests
{
    [Theory(DisplayName = "Q12 最頻値")]
    [InlineData("1\n9\n", "9\n")]
    public void Q12Mode(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q12Mode())));
    }
}
