public class Q24MaxFinalTests
{
    [Theory(DisplayName = "Q24 最大と最後")]
    [InlineData("5 2\n0\n0\n", "5\n5\n")]
    [InlineData("5 0\n", "5\n5\n")]
    public void Q24MaxFinal(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q24MaxFinal())));
    }
}
