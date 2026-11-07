public class Q17SameHeadTests
{
    [Theory(DisplayName = "Q17 先頭が同じ")]
    [InlineData("abc\nax\n", "Yes\n")]
    [InlineData("abc\nx\n", "No\n")]
    [InlineData("a\na\n", "Yes\n")]
    public void Q17SameHead(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q17SameHead())));
    }
}
