public class CbRiseRunTests
{
    [Theory(DisplayName = "到達B 増加の連続")]
    [InlineData("6\n1 3 2 4 6 8\n", "3\n")]
    [InlineData("1\n49\n", "0\n")]
    [InlineData("3\n50 50 50\n", "0\n")]
    [InlineData("4\n1 2 2 3\n", "1\n")]
    public void CbRiseRun(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CbRiseRun())));
    }
}
