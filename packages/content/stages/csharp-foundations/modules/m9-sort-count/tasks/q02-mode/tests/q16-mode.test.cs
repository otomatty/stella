public class Q16ModeTests
{
    [Theory(DisplayName = "Q16 最頻値")]
    [InlineData("2\n0 9\n", "0\n")]
    public void Q16Mode(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q16Mode())));
    }
}
