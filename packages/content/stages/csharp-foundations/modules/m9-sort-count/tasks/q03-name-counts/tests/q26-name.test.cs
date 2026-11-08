public class Q26NameTests
{
    [Theory(DisplayName = "Q26 名前の件数")]
    [InlineData("4 3\ntea\nwater\ntea\ntea\ntea\nmissing\ntea\n", "3\n0\n3\n")]
    public void Q26Name(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q26Name())));
    }
}
