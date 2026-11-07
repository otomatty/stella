public class Q11SameTests
{
    [Theory(DisplayName = "Q11 一致")]
    [InlineData("abc\nabc\n", "Yes\n")]
    [InlineData("abc\nab\n", "No\n")]
    [InlineData("A\na\n", "No\n")]
    [InlineData("\n\n", "Yes\n")]
    public void Q11Same(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q11Same())));
    }
}
