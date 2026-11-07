public class Q03FromZeroTests
{
    [Theory(DisplayName = "Q03 0から N")]
    [InlineData(2, "0\n1\n2\n")]
    [InlineData(0, "0\n")]
    [InlineData(4, "0\n1\n2\n3\n4\n")]
    public void Q03FromZero(int n, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => Answers.Q03FromZero(n)));
    }
}
