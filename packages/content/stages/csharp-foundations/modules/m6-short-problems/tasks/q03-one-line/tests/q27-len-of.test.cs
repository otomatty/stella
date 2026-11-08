public class Q27LenOfTests
{
    [Theory(DisplayName = "Q27 長さ")]
    [InlineData("abc\n", "3\n")]
    [InlineData("\n", "0\n")]
    public void Q27LenOf(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q27LenOf())));
    }
}
