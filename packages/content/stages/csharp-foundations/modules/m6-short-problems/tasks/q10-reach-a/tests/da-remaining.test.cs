public class DaRemainingTests
{
    [Theory(DisplayName = "到達A 残金")]
    [InlineData("500 800\n", "300\n")]
    [InlineData("800 500\n", "-1\n")]
    [InlineData("500 500\n", "0\n")]
    [InlineData("0 0\n", "0\n")]
    public void DaRemaining(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.DaRemaining())));
    }
}
