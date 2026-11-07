public class Q10DownToZeroTests
{
    [Theory(DisplayName = "Q10 N-1から0")]
    [InlineData(4, "3\n2\n1\n0\n")]
    [InlineData(1, "0\n")]
    [InlineData(3, "2\n1\n0\n")]
    public void Q10DownToZero(int n, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => Answers.Q10DownToZero(n)));
    }
}
