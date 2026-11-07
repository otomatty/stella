public class Q19SameUpperTests
{
    [Theory(DisplayName = "Q19 YES")]
    [InlineData("abc\nabc\n", "YES\n")]
    [InlineData("abc\nab\n", "NO\n")]
    [InlineData("\n\n", "YES\n")]
    public void Q19SameUpper(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q19SameUpper())));
    }
}
