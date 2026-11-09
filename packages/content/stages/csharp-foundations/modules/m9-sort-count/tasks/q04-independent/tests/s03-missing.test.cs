public class S03MissingTests
{
    [Theory(DisplayName = "S03 足りない番号")]
    [InlineData("4\n0 1 3 1\n", "2\n")]
    [InlineData("10\n0 1 2 3 4 5 6 7 8 9\n", "-1\n")]
    public void S03Missing(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S03Missing())));
    }
}
