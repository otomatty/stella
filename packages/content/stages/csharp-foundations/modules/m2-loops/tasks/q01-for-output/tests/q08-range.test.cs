public class Q08RangeTests
{
    [Theory(DisplayName = "Q08 Aから B")]
    [InlineData(3, 6, "3\n4\n5\n6\n")]
    [InlineData(5, 5, "5\n")]
    [InlineData(0, 2, "0\n1\n2\n")]
    public void Q08Range(int a, int b, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => Answers.Q08Range(a, b)));
    }
}
