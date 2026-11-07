public class Q25ContainsSpaceTests
{
    [Theory(DisplayName = "Q25 半角空白")]
    [InlineData("a b\n", "Yes\n")]
    [InlineData("ab\n", "No\n")]
    [InlineData(" \n", "Yes\n")]
    [InlineData("\n", "No\n")]
    public void Q25ContainsSpace(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q25ContainsSpace())));
    }
}
