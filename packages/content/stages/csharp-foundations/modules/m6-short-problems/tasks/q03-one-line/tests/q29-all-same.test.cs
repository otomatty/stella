public class Q29AllSameTests
{
    [Theory(DisplayName = "Q29 全部同じ文字")]
    [InlineData("aaa\n", "Yes\n")]
    [InlineData("aba\n", "No\n")]
    [InlineData("a\n", "Yes\n")]
    [InlineData("\n", "No\n")]
    public void Q29AllSame(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q29AllSame())));
    }
}
