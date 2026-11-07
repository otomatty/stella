public class Q25NameTests
{
    [Theory(DisplayName = "Q25 名前の件数")]
    [InlineData("4 3\naa\na\naa\na\naa\nmissing\na\n", "2\n0\n2\n")]
    public void Q25Name(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q25Name())));
    }
}
