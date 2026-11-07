public class Q15LenSTests
{
    [Theory(DisplayName = "Q15 S の長さ")]
    [InlineData("abc\nx\n", "3\n")]
    [InlineData("\nx\n", "0\n")]
    public void Q15LenS(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q15LenS())));
    }
}
