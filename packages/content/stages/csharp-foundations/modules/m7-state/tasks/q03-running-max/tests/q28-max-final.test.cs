public class Q28MaxFinalTests
{
    [Theory(DisplayName = "Q28 最大と最後")]
    [InlineData("-2 2\n5\n-1\n", "3\n2\n")]
    [InlineData("-2 0\n", "-2\n-2\n")]
    public void Q28MaxFinal(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q28MaxFinal())));
    }
}
