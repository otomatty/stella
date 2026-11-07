public class CbRowSpanTests
{
    [Theory(DisplayName = "到達B 行の差")]
    [InlineData("2 3\n-8 -2 -5\n4 4 4\n", "6\n0\n")]
    [InlineData("1 1\n-7\n", "0\n")]
    public void CbRowSpan(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CbRowSpan())));
    }
}
