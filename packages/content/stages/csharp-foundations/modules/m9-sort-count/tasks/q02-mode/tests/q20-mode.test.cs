public class Q20ModeTests
{
    [Theory(DisplayName = "Q20 最頻値")]
    [InlineData("5\n9 0 9 0 0\n", "0\n")]
    public void Q20Mode(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q20Mode())));
    }
}
