public class Q20LenSumTests
{
    [Theory(DisplayName = "Q20 長さの合計")]
    [InlineData("abc\nde\n", "5\n")]
    [InlineData("\n\n", "0\n")]
    public void Q20LenSum(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q20LenSum())));
    }
}
