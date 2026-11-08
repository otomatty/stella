public class CaSkippedTests
{
    [Theory(DisplayName = "到達A 飛ばした件数")]
    [InlineData("10 3\n7\n7\n2\n", "1\n1\n")]
    [InlineData("0 0\n", "0\n0\n")]
    [InlineData("5 2\n5\n0\n", "0\n0\n")]
    public void CaSkipped(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CaSkipped())));
    }
}
