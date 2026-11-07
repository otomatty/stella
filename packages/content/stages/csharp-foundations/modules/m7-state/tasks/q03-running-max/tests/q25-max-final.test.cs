public class Q25MaxFinalTests
{
    [Theory(DisplayName = "Q25 最大と最後")]
    [InlineData("20 3\n-5\n-5\n-5\n", "20\n5\n")]
    [InlineData("20 0\n", "20\n20\n")]
    public void Q25MaxFinal(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q25MaxFinal())));
    }
}
