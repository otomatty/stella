public class Q20SumFoursTests
{
    [Theory(DisplayName = "Q20 1から N の4の倍数の合計")]
    [InlineData(12, 24)]
    [InlineData(3, 0)]
    [InlineData(8, 12)]
    public void Q20SumFours(int n, int expected)
    {
        Assert.Equal(expected, Answers.Q20SumFours(n));
    }
}
