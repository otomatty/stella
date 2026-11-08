public class Q23NameTests
{
    [Theory(DisplayName = "Q23 名前の件数")]
    [InlineData("3 3\ncat\ncat\ndog\ncat\nmissing\ndog\n", "2\n0\n1\n")]
    public void Q23Name(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q23Name())));
    }
}
