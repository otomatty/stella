public class Q17ModeTests
{
    [Theory(DisplayName = "Q17 最頻値")]
    [InlineData("4\n1 2 3 4\n", "1\n")]
    public void Q17Mode(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q17Mode())));
    }
}
