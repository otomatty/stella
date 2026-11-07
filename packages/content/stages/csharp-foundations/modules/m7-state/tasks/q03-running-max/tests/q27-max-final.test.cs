public class Q27MaxFinalTests
{
    [Theory(DisplayName = "Q27 最大と最後")]
    [InlineData("10 0\n", "10\n10\n")]
    [InlineData("10 1\n-3\n", "10\n7\n")]
    public void Q27MaxFinal(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q27MaxFinal())));
    }
}
