public class Q21MaxFinalTests
{
    [Theory(DisplayName = "Q21 最大と最後")]
    [InlineData("10 3\n3\n-4\n2\n", "13\n11\n")]
    [InlineData("10 0\n", "10\n10\n")]
    public void Q21MaxFinal(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q21MaxFinal())));
    }
}
