public class Q22NameTests
{
    [Theory(DisplayName = "Q22 名前の件数")]
    [InlineData("1 3\na\na\nmissing\na\n", "1\n0\n1\n")]
    public void Q22Name(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q22Name())));
    }
}
