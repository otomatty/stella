public class Q29MaxFinalTests
{
    [Theory(DisplayName = "Q29 最大と最後")]
    [InlineData("7 3\n-10\n0\n8\n", "7\n5\n")]
    [InlineData("7 0\n", "7\n7\n")]
    public void Q29MaxFinal(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q29MaxFinal())));
    }
}
