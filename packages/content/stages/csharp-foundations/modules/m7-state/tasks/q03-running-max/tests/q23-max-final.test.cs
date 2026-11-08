public class Q23MaxFinalTests
{
    [Theory(DisplayName = "Q23 最大と最後")]
    [InlineData("8 1\n-8\n", "8\n0\n")]
    [InlineData("8 0\n", "8\n8\n")]
    public void Q23MaxFinal(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q23MaxFinal())));
    }
}
