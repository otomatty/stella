public class Q24NameTests
{
    [Theory(DisplayName = "Q24 名前の件数")]
    [InlineData("3 3\nx\ny\nz\nx\nmissing\nz\n", "1\n0\n1\n")]
    public void Q24Name(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q24Name())));
    }
}
