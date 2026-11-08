public class ConnectLineMaxTests
{
    [Theory(DisplayName = "接続 行の最大")]
    [InlineData("3\n8\n2\n15\n", "15\n")]
    [InlineData("3\n20\n2\n15\n", "20\n")]
    [InlineData("1\n8\n", "8\n")]
    public void ConnectLineMax(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.ConnectLineMax())));
    }
}
