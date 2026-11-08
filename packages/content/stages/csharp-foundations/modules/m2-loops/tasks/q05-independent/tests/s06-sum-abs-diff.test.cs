public class S06SumAbsDiffTests
{
    [Theory(DisplayName = "S06 平均との差")]
    [InlineData(3, 2, 2)]
    [InlineData(0, 5, 0)]
    [InlineData(1, 0, 1)]
    [InlineData(5, 5, 10)]
    [InlineData(2, 30, 57)]
    public void S06SumAbsDiff(int n, int k, int expected)
    {
        Assert.Equal(expected, Answers.S06SumAbsDiff(n, k));
    }
}
