public class S07CountDiffTests
{
    [Theory(DisplayName = "S07 表示が違う場所")]
    [InlineData("abcd\nabXd\n", "1\n")]
    [InlineData("abc\nabc\n", "0\n")]
    [InlineData("a\nb\n", "1\n")]
    public void S07CountDiff(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S07CountDiff())));
    }
}
