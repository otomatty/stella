public class Q16BothEmptyTests
{
    [Theory(DisplayName = "Q16 両方空")]
    [InlineData("\n\n", "empty\n")]
    [InlineData("a\n\n", "ok\n")]
    [InlineData("a\nb\n", "ok\n")]
    public void Q16BothEmpty(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q16BothEmpty())));
    }
}
