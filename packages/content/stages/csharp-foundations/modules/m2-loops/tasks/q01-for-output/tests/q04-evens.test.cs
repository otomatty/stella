public class Q04EvensTests
{
    [Theory(DisplayName = "Q04 偶数を2から N")]
    [InlineData(8, "2\n4\n6\n8\n")]
    [InlineData(2, "2\n")]
    [InlineData(10, "2\n4\n6\n8\n10\n")]
    public void Q04Evens(int n, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => Answers.Q04Evens(n)));
    }
}
