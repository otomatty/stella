public class Q22MaxFinalTests
{
    [Theory(DisplayName = "Q22 最大と最後")]
    [InlineData("0 3\n1\n2\n3\n", "6\n6\n")]
    [InlineData("0 0\n", "0\n0\n")]
    public void Q22MaxFinal(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q22MaxFinal())));
    }
}
