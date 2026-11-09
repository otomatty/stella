public class Q30MaxFinalTests
{
    [Theory(DisplayName = "Q30 最大と最後")]
    [InlineData("1 4\n2\n-4\n3\n-2\n", "3\n0\n")]
    [InlineData("1 0\n", "1\n1\n")]
    public void Q30MaxFinal(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q30MaxFinal())));
    }
}
