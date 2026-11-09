public class Q30NameTests
{
    [Theory(DisplayName = "Q30 名前の件数")]
    [InlineData("4 3\none\ntwo\none\nthree\none\nmissing\nthree\n", "2\n0\n1\n")]
    public void Q30Name(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q30Name())));
    }
}
