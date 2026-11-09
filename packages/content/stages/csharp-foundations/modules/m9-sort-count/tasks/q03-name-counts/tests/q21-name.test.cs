public class Q21NameTests
{
    [Theory(DisplayName = "Q21 名前の件数")]
    [InlineData("3 3\nred\nblue\nred\nred\nmissing\nred\n", "2\n0\n2\n")]
    [InlineData("0 1\na\n", "0\n")]
    public void Q21Name(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q21Name())));
    }
}
