public class Q26MaxFinalTests
{
    [Theory(DisplayName = "Q26 最大と最後")]
    [InlineData("3 2\n-6\n4\n", "3\n1\n")]
    [InlineData("3 0\n", "3\n3\n")]
    public void Q26MaxFinal(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q26MaxFinal())));
    }
}
